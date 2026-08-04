export const Opcode = {
  ping: 1,
  sessionInit: 6,
  profile: 16,
  authRequest: 17,
  auth: 18,
  login: 19,
  authConfirm: 23,
  contactInfo: 32,
  chatInfo: 48,
  photoUpload: 80,
  authLoginCheckPassword: 115,
  storiesList: 208,
  storiesGetByOwner: 210,
  storiesReact: 213,
  storiesMark: 214,
  storiesSend: 215,
  notifStoriesUpdate: 216,
} as const;

export type OpcodeValue = (typeof Opcode)[keyof typeof Opcode];
