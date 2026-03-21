import fs from 'fs';
import path from 'path';

const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = [
  ...getAllFiles(path.join(process.cwd(), 'app')),
  ...getAllFiles(path.join(process.cwd(), 'src'))
];

const replacements = [
  { from: /\bAgents\b/g, to: "Members" },
  { from: /\bagents\b/g, to: "members" },
  { from: /\bAgent\b/g, to: "Member" },
  { from: /\bagent\b/g, to: "member" },
  { from: /\bCEO\b/g, to: "Super Admin" },
  { from: /CEOSettingsPanel/g, to: "SuperAdminSettingsPanel" },
  { from: /cei@gharpayy/g, to: "superadmin@gharpayy" }, // fix email
  { from: /\bceo@gharpayy\b/g, to: "superadmin@gharpayy" }
];

let updatedCount = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  replacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    updatedCount++;
    console.log(`Updated UI terms in ${file}`);
  }
});

console.log(`Successfully updated ${updatedCount} files with UI terminology.`);
