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


function QueueCmd(options = {}) {
    this.list = [];
    this.options = options;
    this.showError = Boolean(options.showError);
}

QueueCmd.prototype = {
    put: function (cmd = "", options = {}) {
        let queueObj = options;
        queueObj.cmd = cmd;
        this.list.push(queueObj);
    },
    getCurrentBranch: function () {
        let that = this,
            name = "",
            result;
        return new Promise(async function (resolve, reject) {
            let queueObj = {
                cmd: "git symbolic-ref --short -q HEAD"
            };
            try {
                let { error, stdout, stderr } = result = await that.exec(queueObj, false);
                name = stdout.trim();
                console.green(name);
                console.green(result);
                resolve(name);
            } catch (err) {
                console.red("get branch name fail");
                reject(err);
            }
        });
    },
    // exec cmd & return Promise
    exec: function (queueObj, showLog = true) {
        let that = this;
        let p = new Promise((resolve, reject) => {
            showLog && console.log("\n");
            showLog && console.chunk(queueObj);
            process.exec(queueObj["cmd"], that.options, (error, stdout, stderr) => {
                let _arguments = {
                    error,
                    stdout,
                    stderr,
                };
                if (error !== null) {
                    showLog && console.red(stderr);
                    showLog && that.showError && console.red(error);
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
    },
    process: function () {
        let that = this;
        return new Promise(async function (resolve, reject) {
            try {
                for (var i = 0; i < that.list.length; i++) {
                    await that.exec(that.list[i]);
                }
                resolve("process queue success !!!");
            } catch (err) {
                reject(err);
            }
        })
    },
    run: function () {
        console.log(this.list)
        return this.process();
    }
}

module.exports = QueueCmd;
