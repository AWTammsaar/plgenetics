let wikipedia = require("node-wikipedia");
let htmlToJson = require("html-to-json");
let Graph = require("graphlib").Graph;
let Promise = require("bluebird");
const cheerio = require('cheerio');
const jsonfile = require('jsonfile');

function influencedBy(text) {
    let jq = cheerio.load(text);
    // Selectors for Wikipedia articles look terrible.
    let elems = jq("th:contains('Influenced by')")
        .parent().next().children()
        .children("a");
    let influencers = [];
    elems.each(function (index) {
        influencers.push(jq(this).attr('href').substring(6));
    });

    return influencers.map(inf => decodeURIComponent(inf.replace(/\+/g,  " ")))
}


let structure = {};

let queue = ['Java_(programming_language)', 'Python_(programming_language)', 'Javascript', 'Rust_(programming_language)'];
let MAX_DEPTH = 15;

function addLang(lang, depth = 0) {
    return new Promise(function (resolve, reject) {
        if (lang in structure || depth >= MAX_DEPTH) {
            resolve();
            return;
        }
        console.log(lang);
        try {
            wikipedia.page.data(lang, {content: true}, function (response) {
                try {
                    let inspiredBy = influencedBy(response.text['*']);
                    structure[lang] = inspiredBy;
                    Promise.all(inspiredBy.map(l => addLang(l, depth + 1)))
                        .then(function () {
                            resolve();
                        })
                } catch (err){
                    console.error(lang + "Cause some low level error");
                    structure[lang] = [];
                    resolve();
                }
            });
        } catch (err) {
            console.error(lang + "Cause some high level error");
            structure[lang] = [];
            resolve();
        }
    });
}

Promise.all(queue.map(q => addLang(q)))
    .then(function () {
        jsonfile.writeFile("../data/influence_map.json", structure, function (err) {
            console.error(err)
        })
    });





