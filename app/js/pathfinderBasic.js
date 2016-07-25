// pathfinder.js
// To find filenames, directory, and array positions from an image id.

function pathFinder(imgID) { // finds the Array value of current loaded comic page
  var pathSource = document.getElementById(imgID).src.substr(7); // returns file:// + $PATH
  console.log(pathSource + " at line 7, pageturn.js");
  var fileNom = pathSource.replace(/^.*[\\\/]/, '').replace(/%20/, ' '); // Returns file name without directory path
  console.log(fileNom + " at line 9, pageturn.js");
  var r = /[^\/]*$/;
  var pathDir = pathSource.replace(r, ''); // Returns directory path
  console.log(pathDir + " at line 12, pageturn.js");
  console.log(fs.readdirSync(pathDir) + " at line 13, pageturn.js")
  var readPathDir = fs.readdirSync(pathDir);
  var indexVar = readPathDir.indexOf(fileNom);
  return indexVar;
};
