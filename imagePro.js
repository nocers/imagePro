//利用同步的方式创建多层文件夹
mkdirsSync = function(dirpath, mode) { 
	mode = mode || '0777';
	var path = require('path'),
		fs = require('fs');
    if (!fs.existsSync(dirpath)) {
        var pathtmp;
        dirpath.split('/').forEach(function(dirname) {
            if (pathtmp) {
                pathtmp = path.join(pathtmp, dirname);
            }
            else {
                pathtmp = dirname;
            }
            if (!fs.existsSync(pathtmp)) {
                if (!fs.mkdirSync(pathtmp, mode)) {
                    return false;
                }
            }
        });
    }
    return true; 
}
//递归删除文件夹
delDirSync = function(path) {
    var files = [];
    var fs = require('fs');
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                delDirSync(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}
imagePro = function(){
	//加载模块，服务器请求模块superagent，文档解析模块cheerio，图片压缩模块imagemin
	var superagent = require('superagent'),
		cheerio =  require('cheerio'),
		fs = require('fs'),
		path =  require('path'),
		imagemin = require('imagemin');
	//判断有无配置文件，无配置文件则创建空文件
	if(!fs.existsSync('config.json')){
		fs.writeFileSync('config.json','{}');
	}
	//加载配置
	var config = JSON.parse(fs.readFileSync('config.json'));
	var web = config.web || 'http://www.dianping.com',   //抓取网址
		tag = config.tag || 'img',    //获取指定元素 规则与jquery一样
		attr = config.attr || 'src',   //获取指定元素的属性 img下的src
		ratio = config.ratio || 0.1,   //可压缩空间比，超过该阈值则图片可以进一步压缩
		flag = config.flag || false,   //已下载过的文件是否需重新下载 false为无需下载
		downloaddir = config.downloaddir || 'download',  //文件下载目录
		compressdir = config.compressdir || 'compress',  //文件压缩后存放目录
		rmdir = config.rmdir || true;
	if(rmdir){
		if(fs.existsSync(downloaddir)){
			delDirSync(downloaddir);
		}
		if(fs.existsSync(compressdir)){
			delDirSync(compressdir);
		}
		if(fs.existsSync('output.txt')){
			fs.unlinkSync('output.txt');
		}	
	}
	superagent.get(web).end(function(err,res){ //请求页面，返回页面文本内容
		if(err){
			return next(err);
		}
		var $ = cheerio.load(res.text);    //文本内容解析
		var elements = $(tag);          //获取指定tag的元素
		if(elements.length > 0){
			elements.each(function(index,element){
				//attr为获取元素的指定属性，如img的src、data-src属性，可通过config.json配置
				var src = $(element).attr(attr);
				var posl = src.indexOf("/","http://".length);
				var filePath = src; 
				if(posl > -1){
					filePath = src.substr(posl+1);
				}
				var dirPath = path.dirname(filePath);  //图片的目录
				var fileName = path.basename(filePath); //图片的文件名
				var cpreFilePath = compressdir+'/' + dirPath;  //压缩后的文件放置compress目录下
				filePath = downloaddir+'/' + filePath;        //原始文件放置download目录下
				mkdirsSync(downloaddir+'/'+dirPath,'0777'); //利用同步的方式创建多层文件夹
				if(!fs.existsSync(filePath) || (fs.existsSync(filePath) && flag)){
					var dataStream = superagent.get(src);
					var stream = fs.createWriteStream(filePath);
					dataStream.pipe(stream);
					dataStream.on('end',function(){
						console.log(filePath+'-------down load over');
						if(fs.existsSync(filePath)){
							//实例化图片压缩对象
							var imObj =  new imagemin() 
								.src(filePath)
			    				.dest(compressdir+'/'+dirPath)
			    				.use(imagemin.jpegtran({ progressive: true }));
			    			//进行图片压缩
				    		imObj.run(function (err, files,stream) {
							    if (err) {
							        throw err;
							    }
							});
							imObj.on('end',function(){     //图片压缩完后处理
							    var cprefSize = fs.statSync(cpreFilePath+'/'+fileName).size;    
							    var fsize = fs.statSync(filePath).size;
							    //console.log(cprefSize+'---'+fsize);
							    //判断可压缩空间，当可压缩空间大于阈值，则添加记录到output.txt文件
							    if((fsize - cprefSize)/fsize > ratio){ 
							    	var str = '文件位置：'+filePath+'\t原始文件大小：'+fsize+'B\t压缩文件大小：'+cprefSize+'B\t文件的下载地址：'+src+'\r\n';
							    	fs.writeFile('output.txt',str,{'flag':'a'},function(){
							    		console.log(filePath+'添加成功');
							    	})
							    }
							})
						}
					})
					
				}
			})
		}else{
			console.log('定位到的下载内容为空或者网络出问题');
		}
	})
}
exports.imagePro = imagePro;