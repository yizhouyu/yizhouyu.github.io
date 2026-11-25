# 密码保护页面

这个网站是公开仓库上的纯静态站，没有服务器，所以「用 JS 判断密码再显示」是假保护。这里的做法是：页面内容在本机用密码加密，进仓库的只有密文；打开页面时在浏览器里输入密码，本地解密。

- 明文源文件：`_private/<页面名>/`（已在 `.gitignore` 里，永远不提交）
- 密码：`_private/passwords.json`（同样不提交）
- 构建工具：`node tools/protect.mjs`（Node 自带的 crypto，不用装任何依赖）
- 产物：仓库根目录的 `<页面名>/`，里面只有一个门页 `index.html` 和若干 `.enc` 密文，这个目录要提交

## 加一个新页面（三步）

1. 写页面：新建 `_private/<页面名>/index.html`，图片等资源放在同一个文件夹里。
2. 设密码：在 `_private/passwords.json` 里加一行，例如 `"diary": "四个以上随机词组成的长口令"`。
3. 构建并发布：

   ```bash
   node tools/protect.mjs
   git add <页面名>/ && git commit -m "add /<页面名>" && git push
   ```

   push 之后两三分钟，`https://yizhouyu.dev/<页面名>/` 就上线了。

页面名只能用小写字母、数字、`-`，也可以带一层目录（如 `demo/notes`）。不能和已有目录重名，工具会拒绝覆盖不是它自己生成的目录。

每次构建结束会自动做一遍验证：用密码能解开、错密码解不开、解出来的内容和源文件逐字节一致、产物里搜不到明文。任何一项不过就报错退出。只想验证不想改文件：`node tools/protect.mjs --verify`。

## 在页面里用加密资源

`index.html` 里可以正常写 HTML、CSS、JS。同一文件夹里的其它文件会各自加密，用下面的方式引用（直接写 `src="photo.jpg"` 是取不到的）：

```html
<img data-secret-src="photo.jpg">
<a data-secret-href="report.pdf" download="report.pdf">下载</a>
<video data-secret-src="clip.mp4" data-secret-poster="cover.jpg" controls></video>
```

需要在脚本里用时，解锁后有一个 `window.vault`：

| 用法 | 作用 |
| --- | --- |
| `await vault.url('photo.jpg')` | 解密并返回一个 `blob:` 地址 |
| `await vault.bytes(name)` / `vault.text(name)` / `vault.json(name)` | 解密并返回内容 |
| `vault.files` | 这个页面里所有资源的名字 |
| `await vault.store.set('key', 值)` / `vault.store.get('key')` / `vault.store.remove('key')` | 把数据用页面密钥加密后存在这台浏览器里 |
| `vault.lock()` | 忘掉密钥并回到门页 |

几点限制：

- 每个资源都是整个下载、整个解密，适合图片、PDF、小音频；大视频会很慢，单个文件不能超过 100 MB。
- CSS 和 JS 建议直接内联在 `index.html` 里。
- 页面里加载的任何第三方脚本都能读到解密后的全部内容。门页本身不带统计脚本，只从 Google Fonts 加载字体。

## 改内容、改密码、删页面

- 改内容：改 `_private/<页面名>/` 里的文件，再跑 `node tools/protect.mjs`，提交并 push。没变的文件不会重新加密，所以 diff 是干净的。
- 改密码：改 `_private/passwords.json` 里那一行，再构建、提交、push。所有「记住」过的设备会自动失效，需要重新输入；`vault.store` 存的数据也随旧密钥作废。注意旧密文还留在 git 历史里，旧密码依然能解开旧版本，所以改密码保护不了已经发布过的内容。
- 删页面：`git rm -r <页面名>/`，再删掉 `_private/<页面名>/` 和 `passwords.json` 里那一行。同样，git 历史里的密文还在。

## 换电脑，或者源文件丢了

已发布的密文就是备份。只要记得密码：

```bash
node tools/protect.mjs --restore <页面名>
```

会把页面解密回 `_private/<页面名>/`。如果 `_private/` 丢了而且密码也忘了，内容就永久找不回来了。

## 门页上的「记住」

- 不勾：密钥只放在当前标签页的 sessionStorage，刷新还在，关掉标签页就没了。
- 勾上：密钥放在 localStorage，这台设备这个浏览器以后直接进，直到点 Lock 或者改密码。
- 存的是派生出来的密钥，不是密码本身。

## 这套保护的边界

- **强度完全取决于密码。** 密文是公开的，任何人都能下载后离线暴力破解，没有次数限制，也没法封人。PBKDF2 60 万次迭代只是让每次尝试慢一点。真正的页面要用长口令（4 个以上随机词）；`/secret` 用的短密码只适合测试，几秒钟就能被猜出来。
- **公开可见的信息：** 这个页面存在、它的网址、加密文件的个数和大小、更新时间。文件名和内容不可见（`.enc` 文件名是随机样子的 ID）。
- **发布过就收不回。** 仓库和它的 git 历史是公开的，密文一旦 push 就应当视为永久公开，将来密码泄露或被破解，旧内容也会暴露。真正敏感的东西（证件、密钥、财务账号）不要放。
- **记住的密钥放在浏览器里。** 能在 yizhouyu.dev 上运行的脚本（包括其它页面上的统计脚本）、浏览器扩展、能碰这台电脑的人，都读得到。公用电脑不要勾「记住」。
- **只防「看」，不防「改」。** 能往仓库里写东西的人可以把门页换成偷密码的版本。
- 需要 HTTPS 和现代浏览器；本地预览用 `python3 -m http.server 8791 --bind 127.0.0.1` 后打开 `http://127.0.0.1:8791/<页面名>/`。

## 文件一览

| 文件 | 说明 |
| --- | --- |
| `tools/protect.mjs` | 构建、验证、恢复 |
| `tools/protect-gate.html` | 门页模板（样式跟主站一致） |
| `tools/protect-runtime.js` | 门页里的解密逻辑和 `window.vault` |
| `_private/` | 明文和密码，不进仓库 |
| `<页面名>/` | 生成的密文目录，不要手改 |

加密参数：PBKDF2-SHA256，600,000 次迭代，每页 16 字节随机 salt，派生 256 位密钥；AES-256-GCM，每个文件独立的随机 IV，并把页面名和文件名作为附加认证数据绑定。
