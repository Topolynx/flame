const createFile = require('./createFile');
const { files } = require('./initialFiles.json');

const initFiles = async () => {
  await Promise.all(files.map((file) => createFile(file)));
};

module.exports = initFiles;
