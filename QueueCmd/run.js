var QueueCmd = require('./QueueCmd');

async function deployToYKZ() {
    let p = new QueueCmd({
        showError: 1
        // cwd: "../ycf_qiniu/"
    });
    // let p = new QueueGit({cwd: ""});
    let bName = await p.getCurrentBranch();

    p.put(`sudo git pull origin ${bName}`, {
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
    // p.put("git status");

    p.put("sudo git add .");
    p.put("sudo git commit -am 'inport files'");
    p.put(`sudo git pull origin ${bName}`);
    p.put(`sudo git push origin ${bName}`);

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
