import { db } from './db.js';

async function run(){
  try{
    const [res] = await db.execute("INSERT INTO Membership (VisitorID, MembershipTypeID, StartDate, ExpirationDate) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))", [6,2])
    console.log('Inserted', res.insertId)
  }catch(e){
    console.error('Insert failed', e)
  }finally{ process.exit(0) }
}
run()
