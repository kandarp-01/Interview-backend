const redisClient = require("../db/redis");
const jwt=require("jsonwebtoken");

async function authUser(req,res,next){
    const token=req.cookies.token;
    if(!token){
        return res.status(403).json({
            message:"Token is missing"
        })
    }
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    const session=await redisClient.HGETALL(`session:${decoded.jti}`);
    if(Object.keys(session).length===0){
        return res.status(403).json({
            message:"Unauthorized"
        })
    }
    req.user={
        userId:session.userId,
        username:session.username,
        email:session.email
    }
    next();
} 


module.exports={authUser}