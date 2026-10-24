// Metro, as Expo sets it up, plus the repository's packages folder: @princess/shared and
// @princess/tokens are linked from ../../packages (file: dependencies), outside this project,
// and Metro only bundles files inside the folders it watches.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../../packages')];

module.exports = config;
