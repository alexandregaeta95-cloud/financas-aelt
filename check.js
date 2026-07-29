const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  if (dir.includes("node_modules") || dir.includes(".git") || dir.includes("dist")) return [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".jsx")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(".");

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (line.includes(".toUpperCase()") || line.includes(".toLowerCase()")) {
      console.log(`${filePath}:${index + 1}:${line.trim()}`);
    }
  });
});
