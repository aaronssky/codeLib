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
        this.list = [];
        this.options = options;
        this.showError = Boolean(options.showError);
    }

    put(cmd = "", options = {}) {
        let queueObj = options;
        queueObj.cmd = cmd;
        this.list.push(queueObj);
    }

    exec(queueObj, showLog = true) {
        let p = new Promise((resolve, reject) => {
            showLog && console.log("\n");
            showLog && console.chunk(queueObj);
            process.exec(queueObj["cmd"], this.options, (error, stdout, stderr) => {
                let _arguments = {
                    error,
                    stdout,
                    stderr,
                };
                if (error !== null) {
                    showLog && console.red(stderr);
                    showLog && this.showError && console.red(error);
                    if (typeof queueObj.fail == 'function') {
                        queueObj.fail({
                            error,
                            stdout,
                            stderr,
                        }, resolve, reject);
                    } else {
                        reject(_arguments);
                    }
                } else {
                    showLog && console.red(stderr);
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

    process() {
        return new Promise(async (resolve, reject) => {
            try {
                for (var i = 0; i < this.list.length; i++) {
                    await this.exec(this.list[i]);
                }
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
                let { error, stdout, stderr } = result = await this.exec(queueObj, false);
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

}

module.exports = {
    QueueCmd,
    QueueGit
};
