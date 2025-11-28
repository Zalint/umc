/**
 * Models Index
 * Aggregates and exports all models
 */

const userModel = require('./user.model');
const geographyModel = require('./geography.model');
const participantModel = require('./participant.model');
const resultModel = require('./result.model');
const memberModel = require('./member.model');
const groupModel = require('./group.model');
const attachmentModel = require('./attachment.model');
const auditModel = require('./audit.model');
const sessionModel = require('./session.model');

module.exports = {
  userModel,
  geographyModel,
  participantModel,
  resultModel,
  memberModel,
  groupModel,
  attachmentModel,
  auditModel,
  sessionModel
};

