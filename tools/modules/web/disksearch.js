/**
 * @fileoverview Disk Search UI
 * @author Jeff Parsons <Jeff@pcjs.org>
 * @copyright © 2012-2023 Jeff Parsons
 * @license MIT <https://www.pcjs.org/LICENSE.txt>
 *
 * This file is part of PCjs, a computer emulation software project at <https://www.pcjs.org>.
 */

/**
 * @class DiskSearch
 * @property {string} url
 * @property {Object} diskettes
 */
export default class DiskSearch {
    /**
     * DiskSearch()
     *
     * @this {DiskSearch}
     * @param {string} [url]
     * @param {string} [idInput]
     * @param {string} [idOutput]
     */
    constructor(url, idInput, idOutput)
    {
        if (url) {
            this.loadDiskettes(url);
        }
        if (idInput) {
            this.input = document.querySelector('#' + idInput);
            if (this.input) {
                this.input.addEventListener("keypress", this.doSearch.bind(this));
                this.input.addEventListener("input", this.incSearch.bind(this));
            }
        }
        if (idOutput) {
            this.output = document.querySelector('#' + idOutput);
        }
    }

    /**
     * loadDiskettes(url)
     *
     * @this {DiskSearch}
     * @param {string} url
     */
    loadDiskettes(url)
    {
        this.url = url;
        fetch(url)
            .then((response) => response.json())
            .then((json) => {
                this.diskettes = json;
                console.log(this.url + ": loaded");
                this.media = [];
                this.walkJSON(json, "/software/pcx86", "@media", this.media);
                console.log("found " + this.media.length + " media items");
                if (this.output) {
                    this.output.innerHTML = "<p>" + this.media.length + " disks available</p>";
                }
            });
    }

    /**
     * walkJSON(json, path, name, results, title)
     *
     * Walk the JSON object tree, looking for the named elements, and return an array of those elements.
     *
     * @param {Object} json
     * @param {string} path
     * @param {string} name
     * @param {Array} results
     * @param {string} [title]
     */
    walkJSON(json, path, name, results, title)
    {
        let keys = Object.keys(json);
        for (let key of keys) {
            let items = json[key];
            if (key == name) {
                if (!Array.isArray(items)) {
                    items = [items];
                }
                for (let item of items) {
                    item['@path'] = path;
                    if (!item['@diskTitle']) item['@diskTitle'] = title;
                    results.push(item);
                }
                continue;
            }
            if (typeof items == "object") {
                title = items['@title'] || title;
                this.walkJSON(items, path + (key[0] != '@'? "/" + key : ""), name, results, title);
            }
        }
    }

    /**
     * containsFile(list, re)
     *
     * @param {string} list
     * @param {RegExp} re
     * @returns {boolean}
     */
    containsFile(list, re)
    {
        return !!(list && list.match(re));
    }

    /**
     * containsText(obj, props, re)
     *
     * @param {object} obj
     * @param {Array} props
     * @param {RegExp} re
     * @returns {boolean}
     */
    containsText(obj, props, re)
    {
        for (let prop of props) {
            if (obj[prop] && obj[prop].match(re)) return true;
        }
        return false;
    }

    /**
     * getMatches(text)
     *
     * @param {string} text
     * @returns {Array} of matching media indexes
     */
    getMatches(text)
    {
        let matches = [];
        text = text.trim();
        let reText = new RegExp(text.replace(/ /g, '.*'), 'i');
        let isFileName = (text.length <= 12 && text.indexOf('.') > 0 && text.indexOf(' ') < 0);
        let reFileName = (isFileName? new RegExp("/" + text + "(||$)", 'i') : null);
        for (let i = 0; i < this.media.length; i++) {
            let media = this.media[i];
            if (this.containsFile(media['@fileList'], reFileName)) {
                matches.push(i);
                continue;
            }
            if (this.containsText(media, ['@diskTitle', '@diskSummary'], reText)) {
                matches.push(i);
            }
        }
        return matches;
    }

    /**
     * doSearch(event)
     *
     * Called on input keypress events, to implement specific search actions.
     *
     * @param {KeyboardEvent} event
     */
    doSearch(event) {
        if (event.key == "Enter") {
            let text = this.input.value;
            this.input.value = "";
            console.log("search for '" + text + "'");
            if (this.output) {
                let list = this.output.getElementsByTagName("ul");
                if (list.length) list[0].remove();
                this.output.innerHTML = "";
                let matches = this.getMatches(text);
                if (matches.length > 0) {
                    this.output.innerHTML = "<p>" + matches.length + " result" + (matches.length > 1? "s" : "") + "</p>";
                    list = document.createElement("ul");
                    for (let i = 0; i < matches.length; i++) {
                        let item = document.createElement('li');
                        let media = this.media[matches[i]];
                        let title = media['@diskTitle'];
                        let summary = media['@diskSummary'];
                        if (!summary) {
                            summary = title;
                            title = "";
                        }
                        if (!title) {
                            title = media['@diskette'].slice(0, -5);
                        }
                        let j = summary.indexOf('.');
                        if (j > 0 && j < summary.length-1) {
                            item.setAttribute("title", summary);
                            summary = summary.slice(0, j) + "...";
                        }
                        item.innerHTML = '<a href="' + media['@path'] + '" target="_blank">' + title + '</a>: ' + summary;
                        list.appendChild(item);
                     }
                     this.output.appendChild(list);
                } else {
                    this.output.innerHTML = "<p>No results for '" + text + "'</p>";
                }
            }
        }
    }

    /**
     * incSearch(event)
     *
     * Called on input field changes, to implement incremental search.
     *
     * @param {InputEvent} event
     */
    incSearch(event) {
        // console.log(event.target.value);
    }
}