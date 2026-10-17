import { pool, transaction } from "../src/server/db";
import { requiredEnv } from "../src/server/config";
import { hashPassword, verifyPassword } from "../src/server/auth";
import { insert } from "../src/server/services/catalog";
import { z } from "zod";

const names = ["Canvas Everyday Tote","Classic Leather Handbag","Lightweight Running Sneakers","Unisex Canvas Sneakers",
  "Linen Summer Shirt","Cotton Polo Shirt","Straight Leg Denim Jeans","Pleated Midi Skirt","Minimal Leather Wallet","Comfort Strap Sandals"];
try {
  if (process.env.APP_ENV !== "development") throw new Error("Seeding requires APP_ENV=development");
  if ((await pool().query("SELECT 1 FROM sellens_seed_records WHERE seed_key=$1 AND entity='retired_seed_set'",["sellens-mvp-v1:catalog-retired"])).rowCount)
    throw new Error("SAMPLE_CATALOG_RETIRED");
  const accounts=await Promise.all(["USER1","USER2","ADMIN"].map(async (label,index)=>{
    const email=z.email().max(254).parse(requiredEnv(`SEED_${label}_EMAIL`).toLowerCase());
    // User-supplied sample passwords allowed only in the development seed command.
    const password=z.string().min(6).max(128).parse(requiredEnv(`SEED_${label}_PASSWORD`));
    return {key:label,email,password,hash:await hashPassword(password),role:index === 2 ? "admin" : "reviewer",name:index === 2 ? "Sample Administrator" : `Sample Reviewer ${index+1}`};
  }));
  if (new Set(accounts.map(a=>a.email)).size !== 3) throw new Error("Sample account emails must be distinct");
  const results=await transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(736551003)");
    if ((await client.query("SELECT 1 FROM sellens_seed_records WHERE seed_key=$1 AND entity='retired_seed_set'",["sellens-mvp-v1:catalog-retired"])).rowCount)
      throw new Error("SAMPLE_CATALOG_RETIRED");
    const counts:Record<string,{inserted:number;reused:number}>={};
    async function ensure(key:string,entity:string,data:Record<string,unknown>) {
      counts[entity]??={inserted:0,reused:0};
      const registered=await client.query("SELECT record_id FROM sellens_seed_records WHERE seed_key=$1 AND entity=$2",[`sellens-mvp-v1:${key}`,entity]);
      if (registered.rows[0]) {
        const found=await client.query(`SELECT * FROM ${entity} WHERE id=$1`,[registered.rows[0].record_id]);
        if (!found.rows[0]) throw new Error("Registered seed record is missing; manual reconciliation required");
        counts[entity].reused++;return found.rows[0];
      }
      // Never adopt or overwrite an unrelated existing account/category.
      if (entity === "users" || entity === "categories") {
        const field=entity === "users" ? "email" : "code";
        const collision=await client.query(`SELECT id FROM ${entity} WHERE ${field}=$1`,[data[field]]);
        if (collision.rows[0]) throw new Error("Sample identity conflicts with an unregistered existing record; choose other sample credentials");
      }
      const row=await insert(client,entity,data);
      await client.query("INSERT INTO sellens_seed_records(seed_key,entity,record_id) VALUES ($1,$2,$3)",[`sellens-mvp-v1:${key}`,entity,row.id]);
      counts[entity].inserted++; return row;
    }
    const seededAccounts=[];
    for (const account of accounts) {
      const row=await ensure(`account:${account.key}`,"users",{full_name:account.name,email:account.email,password_hash:account.hash,role:account.role});
      if (row.email !== account.email || row.role !== account.role || !row.is_active || !await verifyPassword(account.password,row.password_hash))
        throw new Error("Existing sample account no longer matches credentials or role; it was not overwritten");
      seededAccounts.push(row);
    }
    const categories=[];
    for (const [code,name] of [["sample_bags","Sample Bags"],["sample_footwear","Sample Footwear"],["sample_apparel","Sample Apparel"]])
      categories.push(await ensure(`category:${code}`,"categories",{code,name,description:"Synthetic development category"}));
    const products=[];
    for (let i=0;i<10;i++) {
      const row=await ensure(`product:${i+1}`,"products",{name:names[i],category_id:categories[i<2||i===8 ? 0 : i<4||i===9 ? 1 : 2].id,
        description:`Synthetic sample listing for ${names[i].toLowerCase()}; materials and sizing require source verification.`,brand:"Sample Studio",
        currency:"VND",price:[189000,599000,749000,329000,289000,249000,459000,379000,199000,259000][i],
        original_price:[219000,699000,899000,399000,349000,299000,549000,449000,239000,299000][i],
        quantity_sold:[45,12,86,0,34,67,23,9,52,18][i],rating_average:[4.5,4.2,4.7,4.0,4.3,4.6,4.1,3.8,4.4,4.2][i],review_count:[12,4,21,0,9,18,6,3,14,5][i],
        number_of_images:4+(i%3),has_video:i%2===0,sales_scope:"unknown",sales_label_verified:false,
        source_data_json:{synthetic:true,seed_key:`sellens-mvp-v1:product:${i+1}`,source_product_id:`sample-${String(i+1).padStart(2,"0")}`},observed_at:null,imported_by:seededAccounts[2].id});
      products.push(row);
    }
    const analysisIds=[];
    for (let i=0;i<3;i++) {
      const product=products[i];
      const analysis=await ensure(`analysis:${i+1}`,"product_analyses",{product_id:product.id,analyzed_by:seededAccounts[i%2].id,
        status:"insufficient_basis",is_eligible:false,needs_review:true,reference_sold:null,sales_gap:null,
        pipeline_version:"sample-descriptive-v1",model_version:null,input_snapshot_json:product,
        comparison_json:{synthetic:true,peer_ids:[products[(i+1)%10].id],peer_count:1,peer_selection_verified:false},
        evidence_json:{observed:{quantity_sold:Number(product.quantity_sold),rating_average:Number(product.rating_average),review_count:product.review_count},
          limitations:["Synthetic fixture; sales labels and peers are unverified; no model inference performed."]},
        config_json:{prediction_origin:"unavailable",synthetic:true,seed_key:`sellens-mvp-v1:analysis:${i+1}`},
        limitation_note:"Synthetic development snapshot. No forecast or causal claim; observed sales scope remains unverified."});
      analysisIds.push(analysis.id);
      const action=await ensure(`action:${i+1}`,"improvement_actions",{analysis_id:analysis.id,type:"verify_listing_and_stock",title:"Verify listing and sales-label scope",
        description:"Confirm source units and stock information before interpreting the sales snapshot.",
        original_suggestion_json:{synthetic:true,evidence:{sales_label_verified:false},hypothesis:"Interpretation requires verified source units.",action:"Verify listing and stock",validation_needed:"Human source review"},
        assigned_to:seededAccounts[i%2].id,created_by:null});
      await ensure(`history:${i+1}`,"action_history",{action_id:action.id,changed_by:null,event_type:"created",after_json:action,comment:"Synthetic development fixture"});
    }
    return {counts,product_ids:products.map(p=>p.id),analysis_ids:analysisIds,account_roles:["user","user","admin"]};
  });
  console.log(JSON.stringify({status:"seeded",...results},null,2));
} catch (error) { console.error(error instanceof Error && error.message === "SAMPLE_CATALOG_RETIRED" ? "Sample catalog was intentionally retired. Full development seeding is disabled to prevent restoring the test products; existing accounts are preserved." : "Seed failed; transaction rolled back. Check development environment, valid distinct emails, sample passwords and seed conflicts locally. Existing records were not overwritten.");process.exitCode=1; }
finally { await pool().end().catch(()=>{}); }
