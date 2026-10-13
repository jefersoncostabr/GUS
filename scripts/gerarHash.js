import bcrypt from 'bcrypt'

console.log(await bcrypt.hash("sua-senha", 10))
