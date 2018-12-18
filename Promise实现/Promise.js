/**
 * 实现promise
 * 包括基本api实现
 * 包括异步micro task机制
 * 包括原生Promise异常warning机制
 * author: Aron Chen
 * qq: 398155437
 */
class promise {
    constructor(handler) {

        this.status = "pending";
        this.value;
        this._resolveQueue = [];
        this._rejectQueue = [];
        this._hasThen = false;// 只为还原实现Promise的异常提示机制

        const runFulfilled = (value) => {
            this.value = value;
            this.status = "resolved";
            let cb;
            while (cb = this._resolveQueue.shift()) {
                cb(value)
            }
        }

        // 依次执行失败队列中的函数，并清空队列
        const runRejected = (error) => {
            this.value = error;
            this.status = "rejected";
            let cb;
            while (cb = this._rejectQueue.shift()) {
                cb(error)
            }
        }

        const _resolve = (value) => {

            promise._tickCallback(() => {
                if (this.status != "pending") {
                    return;
                }

                if (value instanceof promise) {
                    value.then(runFulfilled, runRejected)
                } else {
                    let cb;
                    runFulfilled(value);
                }
            })
        }

        const _reject = (error) => {

            promise._tickCallback(() => {
                if (this.status != "pending") {
                    return;
                }
                runRejected(error);

                // 实现原生Promise异常warning机制
                // setTimeout(() => {
                if (!this._hasThen) {
                    //表示当前promise的chain链已经到达终点，reject未被接住，输出缺省提示(还原原生promise异常warning机制)
                    console.error("(模拟原生缺省warning) UnhandledPromiseRejectionWarning:", error);
                    if (error instanceof Error) {
                        // 当前未接住的reject是错误是代码报错异常错误
                        // ...
                    } else {
                        // 当前未接住的reject是正常reject(error)
                        // ...
                    }
                }
                // }, 0);
            })


        }

        try {
            handler(_resolve, _reject);
        } catch (e) {
            // 当new promise(handler)中的 handler执行出现语法错误，默认进入reject
            _reject(e);
        }
    }

    then(onFulfilled, onRejected) {

        this._hasThen = true;

        let p = new this.constructor((onFulfilledNext, onRejectedNext) => {

            let fulfilled = value => {
                try {
                    if (typeof onFulfilled !== "function") {
                        // 当.then()没有onFulfilled函数时候，往后个promise执行resolve
                        onFulfilledNext(value);
                    } else {
                        let res = onFulfilled(value);
                        if (res instanceof promise) {
                            res.then(onFulfilledNext, onRejectedNext);
                        } else {
                            onFulfilledNext(res);
                        }
                    }
                } catch (e) {
                    onRejectedNext(e);
                }
            }

            let rejected = error => {
                try {
                    if (typeof onRejected !== "function") {
                        // 当.then()没有onRejected函数时候，往后个promise执行reject
                        onRejectedNext(error);
                    } else {
                        let res = onRejected(error);
                        if (res instanceof promise) {
                            res.then(onFulfilledNext, onRejectedNext);
                        } else {
                            onFulfilledNext(res);
                        }
                    }
                } catch (e) {
                    onRejectedNext(e);
                }
            }

            switch (this.status) {
                case "pending":
                    this._resolveQueue.push(fulfilled);
                    this._rejectQueue.push(rejected);
                    break;
                case "resolved":
                    fulfilled(this.value);
                    break;
                case "rejected":
                    rejected(this.value);
                    break;
            }
        });

        return p;
    }

    catch(fn) {
        return this.then(undefined, fn);
    }

    static resolve(value) {
        if (value instanceof promise) {
            return value;
        }

        return new promise(_resolve => {
            _resolve(value);
        });
    }

    static reject(error) {
        return new promise((_resolve, _reject) => {
            _reject(error);
        });
    }

    static all(list) {
        return new promise((_resolve, _reject) => {
            let values = [];
            let count = 0;
            for (let [i, p] of list.entries()) {
                //用resolve兼容非 instanceof promise的参数
                promise.resolve(p).then(res => {
                    values[i] = res;
                    count++;
                    if (count == list.length) {
                        _resolve(values);
                    }
                }, err => {
                    _reject(err);
                    return err;
                })
            }
        });
    }

    static race(list) {
        return new promise((_resolve, _reject) => {
            for (let p of list) {
                this.resolve(p).then(res => {
                    _resolve(res);
                }, err => {
                    _reject(err);
                })
            }
        });
    }

    // 原在internal/process/next_tick.js中的node底层代码，这里简单模拟实现
    // 异步处理回调
    static _tickCallback(fn) {
        if (typeof process === "object" && typeof process.nextTick === "function") {
            // 若当前环境是node，则优先使用node的micro task实现(完美)
            process.nextTick(fn);
        } else {
            // 若当前环境是window，则用setTimeout粗略处理，
            // 也可用setImmediate等优先兼容，后续优化...
            setTimeout(fn, 0);
        }
    }

    // finally不会改动promise状态，若有返回promise，则后面的then处于等待状态，直到promise有结果
    finally(fn) {
        return this.then(value => {
            return this.constructor.resolve(fn()).then(() => {
                return value;
            })
        }, error => {
            // 若当前promise是resolved状态，但抛出异常却未有catch则会进入该error
            // 若当前promise是rejected状态，且未有onReject或catch则会进入该error
            return this.constructor.resolve(fn()).then(() => {
                // 注:这里不用return， 用throw不仅可以接住上一个promise onReject的参数值
                // 也兼容接住onReject的错误异常，
                throw error;
            })
        })
    }
}

module.exports = promise;

