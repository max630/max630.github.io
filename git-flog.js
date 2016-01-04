// ==UserScript==
// @name        gitFlog
// @namespace   http://max630.net/
// @include     https://github.com/*
// @include     https://api.github.com/*
// @include     https://192.168.0.10/*
// @version     8
// @grant       GM_registerMenuCommand
// @grant       unsafeWindow
// @grant       GM_xmlhttpRequest
// ==/UserScript==
console.log("gm:1");
GM_registerMenuCommand("git-flog", start);
function statePrototype() {
    this.commits = {};
    this.pickCommit = function(hash) {
        if (hash in this.commits) {
            return this.commits[hash];
        } else {
            var c = new commit(hash);
            this.commits[hash] = c;
            return c;
        }
    }
    this.addCommit = function(hash,desc,parents) {
        var c = this.pickCommit(hash);
        if (c.info != null) {
            throw "info already registered for " + hash;
        }
        var parent_objects = parents.map(function(p){ return this.pickCommit(p); }, this);
        c.info = new commitInfo(desc,parent_objects);
        c.sortParents();

    }
}
function scoreGT(s1, s2) {
    var l = (s1.length > s2.length) ? s2.length : s1.length;
    for (var i = 0; i < l; ++i) {
        if (s1[i] > s2[i]) {
            return true;
        } else if (s1[i] < s2[i]) {
            return false;
        }
    }
    if (s1.length > s2.length) {
        return true;
    } else {
        return false;
    }
}
function getCommits(state,url) {
    GM_xmlhttpRequest({
        method:"GET",
        url:url,
        onreadystatechange:function(resp){
            if(resp.readyState == 4) {
                unsafeWindow.document.getElementById("info").textContent = resp.getAllResponseHeaders();
                if (xmlhttp.status == 200) {
                    addCommits(unsafeWindow.state,resp.responseText);
                }
            }
        }
    });
    /*console.log("gm:1.5");
    var xmlhttp = new XMLHttpRequest();
    console.log("gm:2");
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4) {
            document.getElementById("info").textContent = xmlhttp.getAllResponseHeaders();
            if (xmlhttp.status == 200) {
                addCommits(state,xmlhttp.responseText);
            }
        }
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
    console.log("gm:3");*/
}
function commit(hash) {
    this.sortParents = function() {
        if (this.info == null) {
            return;
        }
        var pl = this.info.parents.length;
        var handleParent = function(treeParent,p,pscore){
            if (scoreGT(pscore,p.score)) {
                p.score = pscore;
                p.treeParent = treeParent;
                p.sortParents();
            }
        }
        var nextscore = this.score.concat();
        ++nextscore[nextscore.length - 1];
        handleParent(this.treeParent,this.info.parents[0], nextscore);
        // ignore next parents so far
        // TODO: make the intermediate fake "commit"
        if (pl > 1) {
            handleParent(this,this.info.parents[1], this.score.concat([1]));
        }

        // TODO: bring this separately this
        if (this.domSelf != null) {
            document.getElementById("commits").removeChild(this.domSelf);
            this.domSelf = null;
        }
        this.domSelf = document.createElement("li");
        this.domSelf.id = "li:" + this.hash;
        var a = document.createElement("a");
        a.className = "desc";
        a.setAttribute("href", "https://github.com/git/git/commit/" + hash);
        a.appendChild(document.createTextNode(this.info.desc));
        this.domSelf.appendChild(a);
        this.domSelf.appendChild(document.createTextNode(JSON.stringify(this.score)));
        var base = (this.treeParent == null) ? document.getElementById("commits")
                    : this.treeParent.pickSublist();
        base.appendChild(this.domSelf);
    }
    this.pickSublist = function() {
        if (this.domSelf == null) {
            return null;
        }

        if (this.domSublist != null) {
            return this.domSublist;
        }
        this.domToggle = document.createElement("a");
        this.domToggle.textContent = "[>]";
        // this.domToggle.setAttribute("id", "tg:" + this.hash);
        this.domToggle.setAttribute("href", "javascript:state.commits[\"" + this.hash + "\"].toggle();");
        this.domToggle.setAttribute("class", "toggle");
        this.domSelf.insertBefore(this.domToggle, this.domSelf.childNodes[0]);
        this.domSublist = document.createElement("ul");
        // this.domSublist.setAttribute("id", "ul:" + this.hash);
        this.domSelf.appendChild(this.domSublist);
        this.domSublist.setAttribute("class", "sub-folded");
        return this.domSublist;
    }
    this.toggle = function() {
        if (this.domSublist == null) {
            throw "sublist not defined: " + this.hash;
        }
        switch (this.domSublist.className) {
        case "sub-folded":
            this.domSublist.className = "sub-normal";
            this.domToggle.textContent = "[v]";
            break;
        default:
            this.domSublist.className = "sub-folded";
            this.domToggle.textContent = "[>]";
            break;
        }
    }

    this.hash = hash;
    this.score = [1];
    this.children = [];
    this.treeParent = null;
    this.info = null;
    this.domSelf = null;
    this.domSublist = null;
    this.domToggle = null;
    this.domLinks = [];
}
function commitInfo(desc, parents) {
    this.desc = desc;
    this.parents = parents;
}
function addCommits(state, json) {
    var cs = JSON.parse(json);
    cs.forEach(function(c){
        var desc = c.commit.author.email + ": " + c.commit.message.split("\n")[0];
        state.addCommit(c.sha,desc,c.parents.map(function(p) { return p.sha } ));
    });
    // document.getElementById("info").textContent = json;
}
function start() {
    unsafeWindow.document.documentElement.innerHTML=`<html>
<meta charset="UTF-8">
<style>
.toggle {
    margin-right: 0.25em;
}

.sub-folded {
    display: none;
}

.sub-normal {
}

li:target > .desc {
    background-color: orange;
}
</style>
<body>
<ul id="commits"></ul>
<pre id="info"></pre>
</body>
</html>
`;
    var state = new statePrototype();
    getCommits(state,"https://api.github.com/repos/git/git/commits?sha=master&per_page=100");
}
function statePrototype() {
    this.commits = {};
    this.pickCommit = function(hash) {
        if (hash in this.commits) {
            return this.commits[hash];
        } else {
            var c = new commit(hash);
            this.commits[hash] = c;
            return c;
        }
    }
    this.addCommit = function(hash,desc,parents) {
        var c = this.pickCommit(hash);
        if (c.info != null) {
            throw "info already registered for " + hash;
        }
        var parent_objects = parents.map(function(p){ return this.pickCommit(p); }, this);
        c.info = new commitInfo(desc,parent_objects);
        c.sortParents();

    }
}
function scoreGT(s1, s2) {
    var l = (s1.length > s2.length) ? s2.length : s1.length;
    for (var i = 0; i < l; ++i) {
        if (s1[i] > s2[i]) {
            return true;
        } else if (s1[i] < s2[i]) {
            return false;
        }
    }
    if (s1.length > s2.length) {
        return true;
    } else {
        return false;
    }
}
function getCommits(state,url) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4) {
            document.getElementById("info").textContent = xmlhttp.getAllResponseHeaders();
            if (xmlhttp.status == 200) {
                addCommits(state,xmlhttp.responseText);
            }
        }
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}
function commit(hash) {
    this.sortParents = function() {
        if (this.info == null) {
            return;
        }
        var pl = this.info.parents.length;
        var handleParent = function(treeParent,p,pscore){
            if (scoreGT(pscore,p.score)) {
                p.score = pscore;
                p.treeParent = treeParent;
                p.sortParents();
            }
        }
        var nextscore = this.score.concat();
        ++nextscore[nextscore.length - 1];
        handleParent(this.treeParent,this.info.parents[0], nextscore);
        // ignore next parents so far
        // TODO: make the intermediate fake "commit"
        if (pl > 1) {
            handleParent(this,this.info.parents[1], this.score.concat([1]));
        }

        // TODO: bring this separately this
        if (this.domSelf != null) {
            document.getElementById("commits").removeChild(this.domSelf);
            this.domSelf = null;
        }
        this.domSelf = document.createElement("li");
        this.domSelf.id = "li:" + this.hash;
        var a = document.createElement("a");
        a.className = "desc";
        a.setAttribute("href", "https://github.com/git/git/commit/" + hash);
        a.appendChild(document.createTextNode(this.info.desc));
        this.domSelf.appendChild(a);
        this.domSelf.appendChild(document.createTextNode(JSON.stringify(this.score)));
        var base = (this.treeParent == null) ? document.getElementById("commits")
                    : this.treeParent.pickSublist();
        base.appendChild(this.domSelf);
    }
    this.pickSublist = function() {
        if (this.domSelf == null) {
            return null;
        }

        if (this.domSublist != null) {
            return this.domSublist;
        }
        this.domToggle = document.createElement("a");
        this.domToggle.textContent = "[>]";
        // this.domToggle.setAttribute("id", "tg:" + this.hash);
        this.domToggle.setAttribute("href", "javascript:state.commits[\"" + this.hash + "\"].toggle();");
        this.domToggle.setAttribute("class", "toggle");
        this.domSelf.insertBefore(this.domToggle, this.domSelf.childNodes[0]);
        this.domSublist = document.createElement("ul");
        // this.domSublist.setAttribute("id", "ul:" + this.hash);
        this.domSelf.appendChild(this.domSublist);
        this.domSublist.setAttribute("class", "sub-folded");
        return this.domSublist;
    }
    this.toggle = function() {
        if (this.domSublist == null) {
            throw "sublist not defined: " + this.hash;
        }
        switch (this.domSublist.className) {
        case "sub-folded":
            this.domSublist.className = "sub-normal";
            this.domToggle.textContent = "[v]";
            break;
        default:
            this.domSublist.className = "sub-folded";
            this.domToggle.textContent = "[>]";
            break;
        }
    }

    this.hash = hash;
    this.score = [1];
    this.children = [];
    this.treeParent = null;
    this.info = null;
    this.domSelf = null;
    this.domSublist = null;
    this.domToggle = null;
    this.domLinks = [];
}
function commitInfo(desc, parents) {
    this.desc = desc;
    this.parents = parents;
}
function addCommits(state, json) {
    var cs = JSON.parse(json);
    cs.forEach(function(c){
        var desc = c.commit.author.email + ": " + c.commit.message.split("\n")[0];
        state.addCommit(c.sha,desc,c.parents.map(function(p) { return p.sha } ));
    });
    // document.getElementById("info").textContent = json;
}
function start() {
    unsafeWindow.document.documentElement.innerHTML=`<html>
<meta charset="UTF-8">
<style>
.toggle {
    margin-right: 0.25em;
}

.sub-folded {
    display: none;
}

.sub-normal {
}

li:target > .desc {
    background-color: orange;
}
</style>
<body>
<ul id="commits"></ul>
<pre id="info"></pre>
</body>
</html>
`;
    var state = new statePrototype();
    getCommits(state,"https://api.github.com/repos/git/git/commits?sha=master&per_page=100");
}
