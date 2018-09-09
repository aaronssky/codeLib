const {QueueCmd, QueueGit} = require('./QueueCmd');

async function deployToYKZ() {
    let p = new QueueGit({
        showError: 1,
        cwd: "../../vue-components/"
    });
    // let p = new QueueGit({cwd: ""});
    let bName = await p.getCurrentBranch();

    p.put(`git pull origin ${bName}`, {
        success: function(res, resolve, reject){
            resolve(res);
        },
        fail: function(res, resolve, reject){
            setTimeout(function(){
                // console.red(res)
                reject(res);
            }, 1000);
        },
        finally: function(){
            console.log("finally")
        }
    });
    p.put("git status");

    // p.put("git add .");
    // p.put("git commit -am '测试shell'");
    // p.put('git pull origin ucloud');
    // p.put(`git push origin ${bName}`);

    // p.put('git checkout master');
    // p.put('git pull origin master');
    // p.put(`git pull origin ${bName}`);
    // p.put('git push origin master');

    // p.put('git checkout ucloud');
    // p.put('git pull origin ucloud');
    // p.put(`git pull origin master`);
    // p.put('git push origin ucloud');

    p.run().then(function(res) {
        console.green(res)
    }).catch(function(res) {
        console.red(res)
    });
}

deployToYKZ()
