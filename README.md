# image-compress-tool
前端图片压缩工具，通过canvas将图片转为blob数据。对于iOS上可能存在的照片偏转90°的问题进行自动修正。
- [按照文件大小进行压缩](#ys)
- [按照目标尺寸进行截取](#jq)
- [指定目标文件格式（jpg/png）](#zh)
- [获取ios照片的旋转角度](#jd)
- [blob数据的使用方法](#sy)

### 引入和使用

```
npm install image-compress-tool --save
```

```
import {compressImage} from "image-compress-tool"

compressImage({
	// 配置参数
	file: document.getElementById("avatar").files[0],
	// ...
}).then((blob,fileName)=>{
	// 处理成功的回调函数
	// ...
})
```

```
<input type="file" id="avatar" name="avatar" accept="image/png, image/jpeg">

```

如果要使用script标签引入使用，请参考[博客文章](https://www.cnblogs.com/yangshifu/p/12690130.html)。
### 方法说明
compressImage() 是主要方法，传入一个配置对象{ file, name, type, quality, size, width, height }
 <table>
	<tbody>
		<tr>
			<td style="width:100px">file</td>
			<td>必填，选中的照片文件，input[type=file].files[0]</td>
		</tr>
		<tr>
			<td>name</td>
			<td>自定义文件名，不包含后缀(如.jpg)，默认原文件名</td>
		</tr>
		<tr>
			<td>quality</td>
			<td>图片质量系数，0-1，默认0.92</td>
		</tr>
		<tr>
			<td>size</td>
			<td>图片目标大小，单位kb</td>
		</tr>
		<tr>
			<td>width</td>
			<td>图片目标宽度</td>
		</tr>
		<tr>
			<td>height</td>
			<td>图片目标高度</td>
		</tr>
	</tbody>
 </table>

compressImage() 返回一个Promise，成功的回调函数有两个参数blob和fileName
<table>
	<tbody>
		<tr>
			<td style="width:100px">bolb</td>
			<td>处理之后的图片二进制数据，可用于img标签展示、fromData上传、图片文件下载等</td>
		</tr>
		<tr>
			<td>fileName</td>
			<td>完整文件名，如："user_avatar.png"</td>
		</tr>
	</tbody>
</table>


<h3 id="ys">按照文件大小进行压缩</h3>
<p>会改变图片大小和图片质量，不会改变图片的宽高比例。</p>
<p>例如：将图片压缩至500kb以下</p>

```
compressImage({
	file: document.getElementById("avatar").files[0],
	size: 500
}).then((blob,fileName)=>{
	// ...
})
```

<h3 id="jq">按照目标尺寸进行截取</h3>

<p>例如：将图片宽度压缩至600px，高度自适应</p>

```
compressImage({
	file: document.getElementById("avatar").files[0],
	width: 600
}).then((blob,fileName)=>{
	// ...
})
```
<p>例如：将图片高度压缩至400px，宽度自适应</p>

```
compressImage({
	file: document.getElementById("avatar").files[0],
	height: 400
}).then((blob,fileName)=>{
	// ...
})
```
<p>例如：将图片压缩至600*400，如果图片太长或太宽，会从中间进行截取</p>

```
compressImage({
	file: document.getElementById("avatar").files[0],
	width: 600,
	height: 400
}).then((blob,fileName)=>{
	// ...
})
```


<h3 id="zh">指定目标文件格式</h3>
<p>指定转换之后的格式，不管选中的源文件是jpg还是png。</p>

<p>例如：统一转换到png格式</p>

```
compressImage({
	file: document.getElementById("avatar").files[0],
	type: "png"
}).then((blob,fileName)=>{
	// ...
})
```

<p>例如：压缩文件到500kb以下的png格式，且指定文件名

```
compressImage({
	file: document.getElementById("avatar").files[0],
	size: 500,
	name: "user_avatar_156495325",
	type: "png"
}).then((blob,fileName)=>{
	// 此处的fileName就是 "user_avatar_156495325.png"
	// ...
})
```
<h3 id="jd">获取ios照片的旋转角度</h3>

```
import {getOrientation} from "image-compress-tool"

getOrientation(document.getElementById("avatar").files[0]).then((orientation)=>{
	// orientation 可能的值：1,3,6,8
	// 1: 默认值，不需要修正
	// 3: 需要旋转180°以修正
	// 6: 需要正时针旋转90°以修正
	// 8: 需要正时针旋转270°以修正
})
```

<h3 id="sy">blob数据的使用方法</h3>

```
compressImage({
	file: document.getElementById("avatar").files[0],
	size: 500
}).then((blob,fileName)=>{
	
	/**** 通过<img>显示 ****/
	var img = document.createElement("img");
	img.src = URL.createObjectURL(blob);
	document.body.append(img);
	
	/**** formData上传图片 ****/
	var formData = new FormData();
	formData.append("file", blob, fileName);
	$.ajax({
	    url: 'api/upload/img',
	    type: 'POST',
	    data: formData,
	    success: function(returndata) {
	        console.log("上传成功")
	    }
	})
	
	/**** 下载图片 ****/
	var a = document.createElement('a');
	a.setAttribute('download', fileName);
	a.href = URL.createObjectURL(blob);
	a.click();

})
```
