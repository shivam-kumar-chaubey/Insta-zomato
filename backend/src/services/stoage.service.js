const ImageKit=require('imagekit');

const imageKit=new ImageKit({
  publicKey:process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey:process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint:process.env.IMAGEKIT_URL,
});

async function updoadFile(file, fileName){

  const result=await imageKit.upload({
    file:file,
    fileName:fileName,
  })

  return result;
}



module.exports={
   updoadFile
}