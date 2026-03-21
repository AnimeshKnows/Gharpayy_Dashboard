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
  { from: /'ceo'/g, to: "'super_admin'" },
  { from: /"ceo"/g, to: '"super_admin"' },
  { from: /'agent'/g, to: "'member'" },
  { from: /"agent"/g, to: '"member"' },
  { from: /assignedAgentId/g, to: "assignedMemberId" },
  { from: /assigned_agent_id/g, to: "assigned_member_id" },
  { from: /Agent\.find/g, to: "Member.find" },
  { from: /Agent\.findById/g, to: "Member.findById" },
  { from: /models\/Agent/g, to: "models/User" }, // agents use User model now usually, but if Agent exists, fix import
  { from: /Only CEO/g, to: "Only Super Admin" },
  { from: /Agent not found/g, to: "Member not found" },
  { from: /Agent deleted/g, to: "Member deleted" },
  { from: /Agent updated/g, to: "Member updated" },
  { from: /Agent password/g, to: "Member password" },
  { from: /update agents/g, to: "update members" },
  { from: /delete agents/g, to: "delete members" },
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
    console.log(`Updated ${file}`);
  }
});

console.log(`Successfully updated ${updatedCount} API files.`);
