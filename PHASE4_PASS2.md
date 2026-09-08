# PHASE4 CLEAN PASS 2 - fresh SQLite (audit table supplemented for known migration gap)
demo-seed=120/120/120, rejected=0
GET /cases => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5 => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/graph => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/timeline => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/financial => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/geo => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/story => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/evidence => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/copilot => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/report => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/investigate_all => 200 nonempty=true
GET /cases/2fe7c866-0170-4268-aa3c-3c9d6673fac5/audit => 200 nonempty=true
POST /copilot/query 'transfer' => 200 count=10
POST /copilot/query 'call' => 200 count=10
mixed bulk => {"created":20,"rejected":[{"row":22,"reason":"Missing required field(s): caller"},{"row":23,"reason":"invalid literal for int() with base 10: 'not-a-number'"},{"row":24,"reason":"Invalid isoformat string: 'not-a-date'"}],"sample_ids":["ca9c4e10-9fd5-4b41-a6b5-b819c98f844a","6d686fe1-f89a-4ed5-9c50-f478708376eb","db79d16a-436a-4fdb-827d-dab95bdba748","07d1334a-997c-4615-8811-3b10838097b8","1b3f2c6b-91b8-451d-ab58-de2e227435b7"]}
graph banking edges=120
