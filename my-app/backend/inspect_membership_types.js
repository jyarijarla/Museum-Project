import { db } from './db.js';

async function run(){
  try{
    const [rows] = await db.execute('SELECT * FROM MembershipType')
    console.log('MembershipType rows:', rows)
    process.exit(0)
  }catch(e){
    console.error('Query failed', e)
    process.exit(1)
  }
}

run()
