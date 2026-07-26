import { ManifestRecord, SqlitePage, RecoveredRecord } from '../types';

export const MOCK_MANIFEST_RECORDS: ManifestRecord[] = [
  {
    fileID: '2b2bca6e4f1a2387114b301292100871120a1122',
    domain: 'HomeDomain',
    relativePath: 'Library/SMS/sms.db',
    flags: 1,
    fileMetaHex: '0b303031...a0',
    recoveredFromSlack: false,
    fileSize: 4194304
  },
  {
    fileID: '1a91e0a293b1180d21019280129a009182371928',
    domain: 'HomeDomain',
    relativePath: 'Library/SMS/sms.db-wal',
    flags: 1,
    fileMetaHex: '1e99810a...f3',
    recoveredFromSlack: true,
    fileSize: 2097152
  },
  {
    fileID: '3d0d1282210e39a0021021983012a91280381029',
    domain: 'CameraRollDomain',
    relativePath: 'Media/DCIM/100APPLE/IMG_0842.JPG',
    flags: 1,
    fileMetaHex: '0a12f912...4e',
    recoveredFromSlack: false,
    fileSize: 3410298
  },
  {
    fileID: '5c00a128e0a29381928301292019381029381029',
    domain: 'AppDomain-com.tencent.xin',
    relativePath: 'Documents/MM.sqlite',
    flags: 1,
    fileMetaHex: '91823a10...bc',
    recoveredFromSlack: true,
    fileSize: 1843200
  },
  {
    fileID: '7f901a2830192830192830192830192830192830',
    domain: 'WirelessDomain',
    relativePath: 'Library/Preferences/com.apple.locationd.plist',
    flags: 1,
    fileMetaHex: '02819038...11',
    recoveredFromSlack: false,
    fileSize: 16384
  }
];

export const MOCK_SQLITE_PAGES: SqlitePage[] = [
  {
    pageNumber: 1,
    pageType: 'leaf_table',
    cellCount: 42,
    unallocatedStart: 108,
    freeBlockCount: 3,
    slackSpaceBytes: 412,
    rawHex: '53514c69746520666f726d61742033000400010100402020000000010000000800000000'
  },
  {
    pageNumber: 14,
    pageType: 'freelist_trunk',
    cellCount: 0,
    unallocatedStart: 8,
    freeBlockCount: 12,
    slackSpaceBytes: 3980,
    rawHex: '0000001f0000000300000015000000180000002100000000000000000000000000000000'
  },
  {
    pageNumber: 21,
    pageType: 'freelist_leaf',
    cellCount: 0,
    unallocatedStart: 0,
    freeBlockCount: 1,
    slackSpaceBytes: 4096,
    rawHex: '0d000000020108000fbc0f80000000000000000000000000000000000000000000000000'
  }
];

export const MOCK_RECOVERED_RECORDS: RecoveredRecord[] = [
  {
    id: 1041,
    sourceFile: 'Library/SMS/sms.db (slack space)',
    table: 'message',
    deletedTimestamp: '2026-07-21 14:22:09 UTC',
    dataFields: {
      rowid: 1041,
      guid: '91823A10-B291-482B-891A-C01292100871',
      text: 'Meeting notes & SSH private key recovery instructions sent to backup server.',
      handle_id: '+15550192834',
      service: 'iMessage',
      date_delivered: 774889329
    },
    confidenceScore: 0.98,
    rawCellOffset: 3412
  },
  {
    id: 802,
    sourceFile: 'AddressBook.sqlitedb (freelist page 21)',
    table: 'ABPerson',
    deletedTimestamp: '2026-07-20 09:15:30 UTC',
    dataFields: {
      rowid: 802,
      First: 'Alexander',
      Last: 'Vance',
      Organization: 'Security Operations Group',
      JobTitle: 'Chief Forensic Engineer',
      Note: 'Orphaned contact record extracted from page freelist.'
    },
    confidenceScore: 0.94,
    rawCellOffset: 1208
  },
  {
    id: 3019,
    sourceFile: 'Library/CallHistoryDB/CallHistory.storedata (slack space)',
    table: 'ZCALLRECORD',
    deletedTimestamp: '2026-07-22 18:04:12 UTC',
    dataFields: {
      ZROWID: 3019,
      ZADDRESS: '+15550182938',
      ZDURATION: 412,
      ZDATE: 774986652,
      ZSERVICE_PROVIDER: 'Telephony'
    },
    confidenceScore: 0.91,
    rawCellOffset: 2040
  }
];
