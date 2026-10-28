const fs = require('fs');

function addProp(filePath, target, addition) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('doorDeliveryAvailable')) {
    console.log(`Already present in ${filePath}`);
    return;
  }
  if (content.includes(target)) {
    content = content.replace(target, `${target}\n  ${addition}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.warn(`Target not found in ${filePath}`);
  }
}

addProp('host-web/src/types/index.ts', 'hubAddress: string;', 'doorDeliveryAvailable?: boolean;');
addProp('customer-web/src/types/index.ts', 'hubAddress: string;', 'doorDeliveryAvailable?: boolean;');
addProp('admin-web/src/types/index.ts', 'hubAddress: string;', 'doorDeliveryAvailable?: boolean;');

