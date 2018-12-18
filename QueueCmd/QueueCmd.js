/**
 * QueueCmd 一个node脚本执行命令/方法队列
 * author: Aron Chen
 */

var process = require('child_process');

console.chunk = (p) => {
    console.log("**************************************************");
    console.blue(p)
    console.log("**************************************************\n");
}

console.green = (p) => {
    if (typeof p == 'object') {
        p = JSON.stringify(p);
    }
    console.log("\033[47;32m " + p + " \033[0m")
}

console.red = (p) => {
    if (typeof p == 'object') {
        p = JSON.stringify(p);
    }
    console.log("\033[47;31m " + p + " \033[0m")
}

console.yellow = (p) => {
    if (typeof p == 'object') {
        p = JSON.stringify(p);
    }
    console.log("\033[47;33m " + p + " \033[0m")
}

console.blue = (p) => {
    if (typeof p == 'object') {
        p = JSON.stringify(p);
    }
    console.log("\033[47;34m " + p + " \033[0m")
}


class QueueCmd {

    constructor(options = {}) {
        // 任务队列数组
        this.list = [];

        // 默认设置
        this.options = options;

        // 是否需要开启错误提示
        this.showError = Boolean(options.showError);
    }

    initQueueObj(cmd, options) {
        if (typeof options != "object") {
            options = {};
        }
        let queueObj = options;
        queueObj.cmd = cmd;
        queueObj.state = "pending"; //pending:等待开始，running:已开始，等待结束，resolved:执行成功，rejected:执行失败
        queueObj.cwd = options.cwd || this.options.cwd || ""
        return queueObj;
    }

    insert(cmd = "", options = {}) {
        let queueObj = this.initQueueObj(cmd, options);
        if (this.list.length > 0 && this.list[0].state == "running") {
            this.list.splice(1, 0, queueObj);
        } else {
            this.list.unshift(queueObj);
        }
    }

    put(cmd = "", options = {}) {
        let queueObj = this.initQueueObj(cmd, options);
        this.list.push(queueObj);
    }

    exec(queueObj) {
        console.log("\n");
        if (typeof queueObj.cmd == "string") {
            return this.execCmd(queueObj);
        } else if (typeof queueObj.cmd == "function") {
            return this.execFn(queueObj);
        }
    }

    execCmd(queueObj, showLog = true) {
        let p = new Promise((resolve, reject) => {

            showLog && console.chunk(queueObj["title"] || queueObj["cmd"]);

            let opt = {
                cwd: queueObj["cwd"] || this.options["cwd"] || ""
            };

            process.exec(queueObj["cmd"], opt, (error, stdout, stderr) => {
                let _arguments = {
                    error,
                    stdout,
                    stderr,
                };
                if (error !== null) {
                    showLog && console.yellow(stderr);
                    showLog && console.red(stdout);
                    showLog && this.showError && console.log(_arguments);
                    if (typeof queueObj.fail == 'function') {
                        queueObj.fail(_arguments, resolve, reject);
                    } else {
                        reject(_arguments);
                    }
                } else {
                    showLog && console.yellow(stderr);
                    showLog && console.green(stdout);
                    if (typeof queueObj.success == 'function') {
                        queueObj.success(_arguments, resolve, reject);
                    } else {
                        resolve(_arguments);
                    }
                }

                typeof queueObj.finally == 'function' && p.then(() => {
                    queueObj.finally(_arguments)
                }).catch(() => {
                    queueObj.finally(_arguments)
                });

                return;
            });
        });
        return p;
    }

    execFn(queueObj) {
        let p = new Promise((resolve, reject) => {
            console.chunk(queueObj["title"] || "执行队列Fn");
            queueObj.cmd.call(this, resolve, reject);
        });
        return p;
    }

    process() {
        return new Promise(async (resolve, reject) => {
            try {
                while (this.list.length > 0) {
                    let queueObj = this.list[0];
                    if (queueObj.state == "pending") {
                        queueObj.state = "running";
                        await this.exec(queueObj)
                            .then((res) => {
                                queueObj.state = "resolved";
                                console.log(this.list);
                                this.list.shift(0, 1);
                            })
                            .catch((err) => {
                                queueObj.state = "rejected";
                                this.list.shift(0, 1);
                                throw err; // 注：抛出异常用以中断掉进程，若不加，会导致try后的catch不触发
                            });
                    } else if (queueObj.state == "resolved" || queueObj.state == "rejected") {
                        this.list.shift(0, 1);
                    }
                }

                console.log("\n");
                resolve("process queue success !!!");
            } catch (err) {
                reject(err);
            }
        })
    }

    run() {
        console.log(this.list)
        return this.process();
    }

    // 创建新的实例，共享list队列
    extend(options = {}) {
        let obj = new this.constructor(options);
        //共享同一个队列
        obj.list = this.list;
        return obj;
    }
}

class QueueGit extends QueueCmd {

    constructor(...args) {
        super(...args);
    }

    getCurrentBranch() {
        let name = "",
            result;
        return new Promise(async (resolve, reject) => {
            let queueObj = {
                cmd: "git symbolic-ref --short -q HEAD"
            };
            try {
                let {
                    error,
                    stdout,
                    stderr
                } = result = await this.execCmd(queueObj, false);
                name = stdout.trim();
                console.green(name);
                console.green(result);
                resolve(name);
            } catch (err) {
                console.red("get branch name fail");
                reject(err);
            }
        });
    }

    // 从远程ucloud创建新分支a，并推送到远程a
    checkoutNew_from_ucloud(branchA) {
        this.put(`git fetch`);
        this.put(`git checkout -b ${branchA} origin/ucloud`);
        this.put(`git push origin ${branchA}`);
        this.put(`git branch --set-upstream-to=origin/${branchA}`);
    }

    // 提交本地分支a到远程a
    commit_localA_push_to_originA(branchA, commitMessage) {
        this.put(`git checkout ${branchA}`);
        this.put("git add .");
        this.put(`git commit -am ${commitMessage}`);
        this.put(`git pull origin ${branchA}`);
        this.put(`git push origin ${branchA}`);
    }

    // 切换到分支b，合并远程分支a，提交b到远程
    push_originA_to_originB(branchA, branchB) {
        this.put(`git checkout ${branchB}`);
        this.put(`git pull origin ${branchB}`);
        this.put(`git pull origin ${branchA}`);
        this.put(`git push origin ${branchB}`);
    }

}

module.exports = {
    QueueCmd,
    QueueGit
};