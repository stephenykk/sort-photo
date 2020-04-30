# 按日期整理照片的小工具

## 安装
```bash
	npm config set registry=https://registry.npm.taobao.org
    npm install
```
## 使用
1. 打开 `sortPhoto.js` 
2. 修改首行的 `conf` 配置, 通常指定源文件夹和目标文件夹即可；
3. 执行 `node sortPhoto`

## 其他一些小工具

- `diff.js` 比较两个目录的文件差异，谁多谁少
- `getFiles.js` 递归地获取指定目录下的所有文件
- `deleteThumb.js` 删除不小心从手机备份到电脑的缩略图，_不常用_
- `renameAsDate.js` 按照拍照日期重命名照片(jpg)

## todo
用async/await重构