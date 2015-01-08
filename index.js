var imageTool = require('./imagePro.js');
imageTool.imagePro();
//进行config.json配置文件的监控
// var fs = require('fs');
// fs.watchFile('config.json',function(cur,pre){
// 	imageTool.imagePro();
// })