# PHASE4 CLEAN PASS 1 - fresh SQLite (audit table supplemented for known migration gap)
demo-seed=120/120/120, rejected=0
GET /cases => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04 => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/graph => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/timeline => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/financial => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/geo => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/story => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/evidence => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/copilot => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/report => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/investigate_all => 200 nonempty=true
GET /cases/640085ab-0bb1-4af2-9302-e47374bb7e04/audit => 200 nonempty=true
POST /copilot/query 'transfer' => 200 count=10
POST /copilot/query 'call' => 200 count=10
mixed bulk => {"created":20,"rejected":[{"row":22,"reason":"Missing required field(s): caller"},{"row":23,"reason":"invalid literal for int() with base 10: 'not-a-number'"},{"row":24,"reason":"Invalid isoformat string: 'not-a-date'"}],"sample_ids":["ec9280dd-b01a-4df0-b6ca-ee522a092540","0c5c34f5-2053-403e-b02f-f908f405489e","1dca2458-ae41-40a7-8854-542cdcbfd2c1","f6658280-c88a-47c6-8ec0-d399aa911ebc","fe19129f-f17e-4afb-83ad-c82ecfb02af8"]}
graph banking edges=120
