const fs = require('fs');

const dirTree = require('directory-tree');
const archy = require('archy');

const { filterToMaxDepth, filterIncluded, filterEmptyDirectories } = require('./dirTreeFilters')
const dirTreeToArchyTree = require('./dirTreeToArchyTree');
const wrapHtml = require('./wrapHtml');
const { DirectoryInvalidError } = require('./exceptions');

const defaultOpts = {
    fileTypes: null,
    isHtml: false,
    linkFolders: true,
    include: undefined,
    exclude: undefined,
    emptyDirectories: true,
    maxDepth: Infinity,
};

/**
* Generates a directory tree from the given directory and all sub-directories
* @param {!String} dir The directory to use as the start (this will be the root node of the tree)
* @param {Object} [opts] An object which supports the following options:
*                        {Array.<String>} fileTypes The file types to print. Defaults to all file types.
*                        {RegExp|undefined} include A regular expression matching files/directories to include.
*                        {RegExp|undefined} exclude A regular expression matching files/directories to exclude.
*                        {Boolean} isHtml Whether to produce HTML output. Defaults to false.
*                        {Boolean} linkFolders Link folders when in HTML output mode. Defaults to true.
*                        {Boolean} emptyDirectories Include empty directories. Defaults to true.
*                        {Number} maxDepth Limit results to a maximum sub-directory depth. Defaults to no limit.
* @return {String} A unicode string containing a directory tree
*/
module.exports = (dir, opts) => {
    let stats;
    try {
        stats = fs.statSync(dir);
    } catch(e) {
        throw new DirectoryInvalidError(`Given directory "${dir}" does not exist`);
    }
    if (!stats.isDirectory()) {
        throw new DirectoryInvalidError(`Given directory "${dir}" is not valid`);
    }
    const { include, exclude, fileTypes, isHtml, linkFolders, emptyDirectories, maxDepth } = Object.assign({}, defaultOpts, opts);

    let tree = dirTree(dir, {
        exclude: exclude
            ? new RegExp(exclude)
            : undefined,
        extensions: fileTypes && fileTypes.length
            ? new RegExp(`(?:${fileTypes.join('|').replace('.', '\\.')})$`)
            : undefined,
    });

    if (maxDepth !== Infinity) {
        filterToMaxDepth(tree, maxDepth);
    }
    if (include) {
        // Don't filter out the top level (cwd)
        tree.children = tree.children.filter(child => filterIncluded(child, new RegExp(include)));
    }
    if (!emptyDirectories) {
        filterEmptyDirectories(tree);
    }

    const archyTree = dirTreeToArchyTree(tree, dir, isHtml, linkFolders);
    const outTree = archy(archyTree);
    return isHtml ? wrapHtml(outTree, tree.name) : outTree;
}
