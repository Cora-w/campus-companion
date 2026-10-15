export type CampusPlace = { id:string; name:string; building:string; room:string; x:number; y:number; source:string; closed?:boolean; description?:string; category?:string; polygon?:number[][]; path?:string; pin?:number[]; teacher?:boolean; short?:string; major?:boolean; labelWidth?:number }
// Copied from the user-provided map. Coordinates are not GPS.
export const campusPlaces:CampusPlace[] = [
  {
    "id": "zxl",
    "name": "知行楼",
    "building": "知行楼",
    "room": "由 A 至 F 六个区组成的主教学楼群；飞行器制造学院 · A 区；智能工程学院 · B 区；计算机学院 · C 区；管理工程学院 · D 区；教务处 · E220",
    "x": 1000,
    "y": 704,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园北部的核心教学楼，各区之间有连廊相通。东北侧是东风广场，南面是问天广场。",
    "category": "teach",
    "polygon": [
      [
        976,
        600
      ],
      [
        1048,
        612
      ],
      [
        1040,
        676
      ],
      [
        990,
        676
      ],
      [
        962,
        694
      ],
      [
        1030,
        716
      ],
      [
        1022,
        770
      ],
      [
        968,
        744
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 86
  },
  {
    "id": "zA",
    "name": "知行楼 A区",
    "building": "知行楼 A区",
    "room": "飞行器制造学院；飞行器制造学院 · A 区",
    "x": 938.75,
    "y": 504,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "知行楼北翼，沿东风大道方向延伸，紧邻东风广场。",
    "category": "teach",
    "polygon": [
      [
        865,
        425
      ],
      [
        902,
        415
      ],
      [
        1012,
        578
      ],
      [
        976,
        598
      ]
    ],
    "teacher": false,
    "short": "A区",
    "major": false,
    "labelWidth": 147
  },
  {
    "id": "zB",
    "name": "知行楼 B区",
    "building": "知行楼 B区",
    "room": "智能工程学院；智能工程学院 · B 区",
    "x": 1175,
    "y": 651,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "知行楼东翼，是楼群中最长的一段，东端靠近驿都北路。",
    "category": "teach",
    "polygon": [
      [
        1048,
        612
      ],
      [
        1306,
        646
      ],
      [
        1306,
        688
      ],
      [
        1040,
        658
      ]
    ],
    "teacher": false,
    "short": "B区",
    "major": false,
    "labelWidth": 266
  },
  {
    "id": "zC",
    "name": "知行楼 C区",
    "building": "知行楼 C区",
    "room": "计算机学院；计算机学院 · C 区",
    "x": 884,
    "y": 730.5,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "知行楼西南翼，西侧挨着雒城北路，南面就是问天广场。",
    "category": "teach",
    "polygon": [
      [
        800,
        718
      ],
      [
        962,
        694
      ],
      [
        968,
        744
      ],
      [
        806,
        766
      ]
    ],
    "teacher": false,
    "short": "C区",
    "major": false,
    "labelWidth": 168
  },
  {
    "id": "zD",
    "name": "知行楼 D区",
    "building": "知行楼 D区",
    "room": "管理工程学院；管理工程学院 · D 区",
    "x": 1091,
    "y": 754.5,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "知行楼东南段，面向问天广场东侧。",
    "category": "teach",
    "polygon": [
      [
        1030,
        716
      ],
      [
        1162,
        740
      ],
      [
        1150,
        792
      ],
      [
        1022,
        770
      ]
    ],
    "teacher": false,
    "short": "D区",
    "major": false,
    "labelWidth": 140
  },
  {
    "id": "zE",
    "name": "知行楼 E区",
    "building": "知行楼 E区",
    "room": "教务处 E220；教务处 · E220",
    "x": 952.75,
    "y": 649,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "知行楼西侧连接段。选课、成绩、考试安排、学籍等事务到教务处办理。",
    "category": "office",
    "polygon": [
      [
        915,
        622
      ],
      [
        978,
        608
      ],
      [
        990,
        676
      ],
      [
        928,
        690
      ]
    ],
    "teacher": false,
    "short": "E区",
    "major": false,
    "labelWidth": 75
  },
  {
    "id": "zF",
    "name": "知行楼 F区",
    "building": "知行楼 F区",
    "room": "连接 B 区与 D 区",
    "x": 1073,
    "y": 696.5,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "知行楼中部连接段，从这里可以穿行到 B 区和 D 区。",
    "category": "teach",
    "polygon": [
      [
        1040,
        676
      ],
      [
        1112,
        686
      ],
      [
        1106,
        716
      ],
      [
        1034,
        708
      ]
    ],
    "teacher": false,
    "short": "F区",
    "major": false,
    "labelWidth": 78
  },
  {
    "id": "wtgc",
    "name": "问天广场",
    "building": "问天广场",
    "room": "知行楼南侧大广场",
    "x": 1026.8,
    "y": 833.6,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "知行楼与晋阳路之间的开阔广场，往返教学区和宿舍区的必经之地。",
    "category": "life",
    "polygon": [
      [
        790,
        790
      ],
      [
        1140,
        782
      ],
      [
        1200,
        832
      ],
      [
        1214,
        882
      ],
      [
        790,
        882
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 424
  },
  {
    "id": "dfgc",
    "name": "东风广场",
    "building": "东风广场",
    "room": "知行楼东北侧",
    "x": 1138,
    "y": 580.1666666666666,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "位于 A 区与 B 区之间、东风大道一侧的绿化广场。",
    "category": "life",
    "polygon": [
      [
        1012,
        520
      ],
      [
        1150,
        525
      ],
      [
        1300,
        600
      ],
      [
        1306,
        646
      ],
      [
        1048,
        612
      ],
      [
        1012,
        578
      ]
    ],
    "teacher": false,
    "major": false,
    "labelWidth": 294
  },
  {
    "id": "ftgc",
    "name": "飞天广场",
    "building": "飞天广场",
    "room": "明志楼南侧，正对校门",
    "x": 977,
    "y": 1520,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "从航天大道进校后看到的第一个广场，北面就是明志楼。",
    "category": "life",
    "path": "M870 1452 H1085 V1520 Q1085 1630 977 1640 Q870 1630 870 1520 Z",
    "teacher": false,
    "major": true,
    "labelWidth": 200
  },
  {
    "id": "sx1",
    "name": "实训车间（西）",
    "building": "实训车间（西）",
    "room": "实践教学用房",
    "x": 715,
    "y": 935,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "晋阳路南侧的实训车间之一，用于专业实操和实训课程。",
    "category": "teach",
    "polygon": [
      [
        650,
        910
      ],
      [
        780,
        910
      ],
      [
        780,
        960
      ],
      [
        650,
        960
      ]
    ],
    "teacher": false,
    "short": "实训车间",
    "major": false,
    "labelWidth": 130
  },
  {
    "id": "sx2",
    "name": "实训车间（东）",
    "building": "实训车间（东）",
    "room": "实践教学用房",
    "x": 867.5,
    "y": 935,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "晋阳路南侧的实训车间之一，紧挨雒城南路。",
    "category": "teach",
    "polygon": [
      [
        805,
        910
      ],
      [
        930,
        910
      ],
      [
        930,
        960
      ],
      [
        805,
        960
      ]
    ],
    "teacher": false,
    "short": "实训车间",
    "major": false,
    "labelWidth": 125
  },
  {
    "id": "wh",
    "name": "文汇楼",
    "building": "文汇楼",
    "room": "人文社科学院、马克思主义学院；人文社科学院 · ；马克思主义学院 · ",
    "x": 525.3333333333334,
    "y": 1137.3333333333333,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "西区的教学楼，东邻图书馆，南面是川北路。从川北路一直往西可以走到后街。",
    "category": "teach",
    "polygon": [
      [
        488,
        1050
      ],
      [
        588,
        1050
      ],
      [
        588,
        1190
      ],
      [
        500,
        1190
      ],
      [
        500,
        1172
      ],
      [
        488,
        1172
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 100
  },
  {
    "id": "tsg",
    "name": "图书馆",
    "building": "图书馆",
    "room": "借阅、自习",
    "x": 711,
    "y": 1127.5,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "文汇楼东侧，雒城南路西侧。周边环境安静，适合自习。",
    "category": "teach",
    "polygon": [
      [
        672,
        1070
      ],
      [
        750,
        1070
      ],
      [
        750,
        1185
      ],
      [
        672,
        1185
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 78
  },
  {
    "id": "zy",
    "name": "致远楼",
    "building": "致远楼",
    "room": "财务处 201；财务处 · 201",
    "x": 873.3333333333334,
    "y": 1187.6666666666667,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "位于雒城南路与前进中路之间，北面有水系和小湖。缴费、报销等财务事项到 201 财务处。",
    "category": "office",
    "polygon": [
      [
        825,
        1148
      ],
      [
        945,
        1148
      ],
      [
        945,
        1205
      ],
      [
        858,
        1205
      ],
      [
        842,
        1215
      ],
      [
        825,
        1205
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 120
  },
  {
    "id": "qx",
    "name": "劝学楼",
    "building": "劝学楼",
    "room": "学生事务最集中的一栋楼；一站式服务社区 · 北 1 层；学工部 & 团委 · 北 202；学生资助中心 · 北 205；继续教育部 · 南 108–111；就业处 · 南 201；保卫处（警务服务站） · 劝学楼",
    "x": 1095,
    "y": 1196,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "位于神舟宿舍群正南、川北路北侧，学工、资助、就业、继续教育和保卫等部门都在这里，是办事的首选。",
    "category": "office",
    "polygon": [
      [
        1000,
        1165
      ],
      [
        1190,
        1165
      ],
      [
        1190,
        1227
      ],
      [
        1000,
        1227
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 190
  },
  {
    "id": "mz",
    "name": "明志楼",
    "building": "明志楼",
    "room": "车辆工程学院、数码艺术学院；车辆工程学院 · ；数码艺术学院 · ",
    "x": 977.5,
    "y": 1432.5,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "正对校门的主楼，前面是飞天广场。",
    "category": "teach",
    "polygon": [
      [
        890,
        1405
      ],
      [
        1065,
        1405
      ],
      [
        1065,
        1445
      ],
      [
        1040,
        1445
      ],
      [
        1040,
        1435
      ],
      [
        915,
        1435
      ],
      [
        915,
        1445
      ],
      [
        890,
        1445
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 175
  },
  {
    "id": "xy",
    "name": "西园综合楼",
    "building": "西园综合楼",
    "room": "西区综合用房",
    "x": 541,
    "y": 1296,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "川北路南侧、校园最西边的综合楼。往西出去就是去后街的方向。",
    "category": "life",
    "polygon": [
      [
        472,
        1255
      ],
      [
        610,
        1255
      ],
      [
        610,
        1337
      ],
      [
        472,
        1337
      ]
    ],
    "teacher": false,
    "major": false,
    "labelWidth": 138
  },
  {
    "id": "bd",
    "name": "北斗公寓",
    "building": "北斗公寓",
    "room": "公寓楼",
    "x": 703,
    "y": 1303,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "西园综合楼东侧，北面是川北路，南面是教师公寓区。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        638,
        1287
      ],
      [
        768,
        1287
      ],
      [
        768,
        1319
      ],
      [
        638,
        1319
      ]
    ],
    "teacher": false,
    "major": false,
    "labelWidth": 130
  },
  {
    "id": "sz8",
    "name": "神舟8号",
    "building": "神舟8号",
    "room": "学生公寓",
    "x": 1046.5,
    "y": 929,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "神舟宿舍群位于晋阳路以南、劝学楼以北，夹在前进中路与驿都南路之间。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1000,
        910
      ],
      [
        1093,
        910
      ],
      [
        1093,
        948
      ],
      [
        1000,
        948
      ]
    ],
    "teacher": false,
    "short": "神舟8",
    "major": false,
    "labelWidth": 93
  },
  {
    "id": "sz7",
    "name": "神舟7号",
    "building": "神舟7号",
    "room": "学生公寓",
    "x": 1143.5,
    "y": 929,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "神舟宿舍群位于晋阳路以南、劝学楼以北，夹在前进中路与驿都南路之间。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1097,
        910
      ],
      [
        1190,
        910
      ],
      [
        1190,
        948
      ],
      [
        1097,
        948
      ]
    ],
    "teacher": false,
    "short": "神舟7",
    "major": false,
    "labelWidth": 93
  },
  {
    "id": "sz6",
    "name": "神舟6号",
    "building": "神舟6号",
    "room": "学生公寓",
    "x": 1046.5,
    "y": 1004,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "神舟宿舍群位于晋阳路以南、劝学楼以北，夹在前进中路与驿都南路之间。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1000,
        985
      ],
      [
        1093,
        985
      ],
      [
        1093,
        1023
      ],
      [
        1000,
        1023
      ]
    ],
    "teacher": false,
    "short": "神舟6",
    "major": false,
    "labelWidth": 93
  },
  {
    "id": "sz5",
    "name": "神舟5号",
    "building": "神舟5号",
    "room": "学生公寓",
    "x": 1143.5,
    "y": 1004,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "神舟宿舍群位于晋阳路以南、劝学楼以北，夹在前进中路与驿都南路之间。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1097,
        985
      ],
      [
        1190,
        985
      ],
      [
        1190,
        1023
      ],
      [
        1097,
        1023
      ]
    ],
    "teacher": false,
    "short": "神舟5",
    "major": false,
    "labelWidth": 93
  },
  {
    "id": "sz4",
    "name": "神舟4号",
    "building": "神舟4号",
    "room": "学生公寓",
    "x": 1046.5,
    "y": 1074,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "神舟宿舍群位于晋阳路以南、劝学楼以北，夹在前进中路与驿都南路之间。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1000,
        1055
      ],
      [
        1093,
        1055
      ],
      [
        1093,
        1093
      ],
      [
        1000,
        1093
      ]
    ],
    "teacher": false,
    "short": "神舟4",
    "major": false,
    "labelWidth": 93
  },
  {
    "id": "sz3",
    "name": "神舟3号",
    "building": "神舟3号",
    "room": "学生公寓",
    "x": 1143.5,
    "y": 1074,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "神舟宿舍群位于晋阳路以南、劝学楼以北，夹在前进中路与驿都南路之间。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1097,
        1055
      ],
      [
        1190,
        1055
      ],
      [
        1190,
        1093
      ],
      [
        1097,
        1093
      ]
    ],
    "teacher": false,
    "short": "神舟3",
    "major": false,
    "labelWidth": 93
  },
  {
    "id": "sz2",
    "name": "神舟2号",
    "building": "神舟2号",
    "room": "学生公寓",
    "x": 1046.5,
    "y": 1137,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "神舟宿舍群位于晋阳路以南、劝学楼以北，夹在前进中路与驿都南路之间。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1000,
        1118
      ],
      [
        1093,
        1118
      ],
      [
        1093,
        1156
      ],
      [
        1000,
        1156
      ]
    ],
    "teacher": false,
    "short": "神舟2",
    "major": false,
    "labelWidth": 93
  },
  {
    "id": "sz1",
    "name": "神舟1号",
    "building": "神舟1号",
    "room": "学生公寓",
    "x": 1143.5,
    "y": 1137,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "神舟宿舍群位于晋阳路以南、劝学楼以北，夹在前进中路与驿都南路之间。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1097,
        1118
      ],
      [
        1190,
        1118
      ],
      [
        1190,
        1156
      ],
      [
        1097,
        1156
      ]
    ],
    "teacher": false,
    "short": "神舟1",
    "major": false,
    "labelWidth": 93
  },
  {
    "id": "sz9",
    "name": "神舟9号",
    "building": "神舟9号",
    "room": "学生公寓",
    "x": 1392.5,
    "y": 1212.5,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "天舟食堂东侧，川北路北边，离体育馆很近。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1345,
        1195
      ],
      [
        1440,
        1195
      ],
      [
        1440,
        1230
      ],
      [
        1345,
        1230
      ]
    ],
    "teacher": false,
    "short": "神舟9",
    "major": false,
    "labelWidth": 95
  },
  {
    "id": "ce3",
    "name": "嫦娥3号",
    "building": "嫦娥3号",
    "room": "学生公寓",
    "x": 1285,
    "y": 931,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "驿都南路东侧，与神舟宿舍群隔路相望。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1240,
        912
      ],
      [
        1330,
        912
      ],
      [
        1330,
        950
      ],
      [
        1240,
        950
      ]
    ],
    "teacher": false,
    "short": "嫦娥3",
    "major": false,
    "labelWidth": 90
  },
  {
    "id": "ce2",
    "name": "嫦娥2号",
    "building": "嫦娥2号",
    "room": "学生公寓",
    "x": 1285,
    "y": 1001,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "驿都南路东侧，与神舟宿舍群隔路相望。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1240,
        982
      ],
      [
        1330,
        982
      ],
      [
        1330,
        1020
      ],
      [
        1240,
        1020
      ]
    ],
    "teacher": false,
    "short": "嫦娥2",
    "major": false,
    "labelWidth": 90
  },
  {
    "id": "ce1",
    "name": "嫦娥1号",
    "building": "嫦娥1号",
    "room": "学生公寓",
    "x": 1285,
    "y": 1071,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "驿都南路东侧，与神舟宿舍群隔路相望。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1240,
        1052
      ],
      [
        1330,
        1052
      ],
      [
        1330,
        1090
      ],
      [
        1240,
        1090
      ]
    ],
    "teacher": false,
    "short": "嫦娥1",
    "major": false,
    "labelWidth": 90
  },
  {
    "id": "ce4",
    "name": "嫦娥4号",
    "building": "嫦娥4号",
    "room": "学生公寓",
    "x": 1475,
    "y": 947.5,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "东北生活区，位于天和食堂东南，后勤保障楼北侧。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1428,
        903
      ],
      [
        1540,
        948
      ],
      [
        1522,
        992
      ],
      [
        1410,
        947
      ]
    ],
    "teacher": false,
    "short": "嫦娥4",
    "major": false,
    "labelWidth": 130
  },
  {
    "id": "fy1",
    "name": "风云1号",
    "building": "风云1号",
    "room": "学生公寓",
    "x": 1640,
    "y": 995,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园东北角的宿舍楼，东侧是球场和绿地。宿舍报修、调换寝室等事项可到后勤保障楼 206 公寓管理中心办理。",
    "category": "dorm",
    "polygon": [
      [
        1595,
        915
      ],
      [
        1730,
        975
      ],
      [
        1685,
        1075
      ],
      [
        1550,
        1015
      ]
    ],
    "teacher": false,
    "short": "风云1",
    "major": false,
    "labelWidth": 180
  },
  {
    "id": "th",
    "name": "天和食堂",
    "building": "天和食堂",
    "room": "东北生活区食堂",
    "x": 1350.75,
    "y": 837.5,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "驿都北路东侧，离知行楼、嫦娥宿舍和风云1号都很近，下课吃饭顺路。",
    "category": "food",
    "polygon": [
      [
        1305,
        770
      ],
      [
        1425,
        815
      ],
      [
        1395,
        905
      ],
      [
        1278,
        860
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 147
  },
  {
    "id": "tz",
    "name": "天舟食堂",
    "building": "天舟食堂",
    "room": "南部生活区食堂",
    "x": 1285,
    "y": 1170,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "驿都南路东侧、嫦娥1号南面，服务神舟、嫦娥宿舍区。旁边就是菜鸟驿站。",
    "category": "food",
    "polygon": [
      [
        1250,
        1120
      ],
      [
        1320,
        1120
      ],
      [
        1320,
        1220
      ],
      [
        1250,
        1220
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 70
  },
  {
    "id": "hq",
    "name": "后勤保障楼",
    "building": "后勤保障楼",
    "room": "后勤处 · 公寓管理中心 206；后勤处（公寓管理中心） · 206",
    "x": 1419,
    "y": 984.5,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "嫦娥4号南侧。宿舍报修、调宿、水电等后勤问题到这里处理。",
    "category": "office",
    "polygon": [
      [
        1368,
        945
      ],
      [
        1482,
        990
      ],
      [
        1470,
        1024
      ],
      [
        1356,
        979
      ]
    ],
    "teacher": false,
    "short": "后勤楼",
    "major": false,
    "labelWidth": 126
  },
  {
    "id": "tyg",
    "name": "体育馆",
    "building": "体育馆",
    "room": "室内运动场馆",
    "x": 1393.8,
    "y": 1314,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "川北路以南、运动场正北，室内体育课和各类比赛多在这里。",
    "category": "sport",
    "polygon": [
      [
        1355,
        1290
      ],
      [
        1385,
        1270
      ],
      [
        1437,
        1270
      ],
      [
        1437,
        1370
      ],
      [
        1355,
        1370
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 82
  },
  {
    "id": "ydc",
    "name": "运动场",
    "building": "运动场",
    "room": "400 米标准跑道 + 足球场",
    "x": 1365,
    "y": 1520,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园东南角的田径运动场，西侧有看台。地图的比例尺就是按这条 400 米跑道估算的。",
    "category": "sport",
    "polygon": [
      [
        1295,
        1395
      ],
      [
        1435,
        1395
      ],
      [
        1435,
        1645
      ],
      [
        1295,
        1645
      ]
    ],
    "teacher": false,
    "major": true,
    "labelWidth": 140
  },
  {
    "id": "kt",
    "name": "看台及附属",
    "building": "看台及附属",
    "room": "运动场看台",
    "x": 1220,
    "y": 1515,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "运动场西侧看台，附带部分体育用房。",
    "category": "sport",
    "polygon": [
      [
        1192,
        1420
      ],
      [
        1248,
        1420
      ],
      [
        1248,
        1610
      ],
      [
        1192,
        1610
      ]
    ],
    "teacher": false,
    "short": "看台",
    "major": false,
    "labelWidth": 56
  },
  {
    "id": "lqc",
    "name": "篮球场",
    "building": "篮球场",
    "room": "室外篮球场",
    "x": 1215,
    "y": 1368,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "前进东路东侧，体育馆西南，课余打球的好去处。",
    "category": "sport",
    "polygon": [
      [
        1122,
        1335
      ],
      [
        1308,
        1335
      ],
      [
        1308,
        1401
      ],
      [
        1122,
        1401
      ]
    ],
    "teacher": false,
    "major": false,
    "labelWidth": 186
  },
  {
    "id": "p1",
    "name": "停车场（体育馆西）",
    "building": "停车场（体育馆西）",
    "room": "停车场",
    "x": 1215,
    "y": 1293,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "劝学楼南、篮球场北的停车场。",
    "category": "life",
    "polygon": [
      [
        1122,
        1262
      ],
      [
        1308,
        1262
      ],
      [
        1308,
        1324
      ],
      [
        1122,
        1324
      ]
    ],
    "teacher": false,
    "short": "P",
    "major": false,
    "labelWidth": 186
  },
  {
    "id": "p2",
    "name": "停车场（校门东）",
    "building": "停车场（校门东）",
    "room": "停车场",
    "x": 1151,
    "y": 1591,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "靠近校门和运动场的停车场。",
    "category": "life",
    "polygon": [
      [
        1120,
        1555
      ],
      [
        1182,
        1555
      ],
      [
        1182,
        1627
      ],
      [
        1120,
        1627
      ]
    ],
    "teacher": false,
    "short": "P",
    "major": false,
    "labelWidth": 62
  },
  {
    "id": "p3",
    "name": "停车场（西区）",
    "building": "停车场（西区）",
    "room": "停车场",
    "x": 537,
    "y": 1391,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "西园综合楼南侧，教师公寓区北边。",
    "category": "life",
    "polygon": [
      [
        482,
        1368
      ],
      [
        592,
        1368
      ],
      [
        592,
        1414
      ],
      [
        482,
        1414
      ]
    ],
    "teacher": false,
    "short": "P",
    "major": false,
    "labelWidth": 110
  },
  {
    "id": "js1",
    "name": "教师公寓 1 栋",
    "building": "教师公寓 1 栋",
    "room": "教师公寓区",
    "x": 497,
    "y": 1504,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        478,
        1492
      ],
      [
        516,
        1492
      ],
      [
        516,
        1516
      ],
      [
        478,
        1516
      ]
    ],
    "teacher": true,
    "short": "1",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js2",
    "name": "教师公寓 2 栋",
    "building": "教师公寓 2 栋",
    "room": "教师公寓区",
    "x": 546,
    "y": 1504,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        527,
        1492
      ],
      [
        565,
        1492
      ],
      [
        565,
        1516
      ],
      [
        527,
        1516
      ]
    ],
    "teacher": true,
    "short": "2",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js3",
    "name": "教师公寓 3 栋",
    "building": "教师公寓 3 栋",
    "room": "教师公寓区",
    "x": 592,
    "y": 1504,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        573,
        1492
      ],
      [
        611,
        1492
      ],
      [
        611,
        1516
      ],
      [
        573,
        1516
      ]
    ],
    "teacher": true,
    "short": "3",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js4",
    "name": "教师公寓 4 栋",
    "building": "教师公寓 4 栋",
    "room": "教师公寓区",
    "x": 659,
    "y": 1504,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        640,
        1492
      ],
      [
        678,
        1492
      ],
      [
        678,
        1516
      ],
      [
        640,
        1516
      ]
    ],
    "teacher": true,
    "short": "4",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js5",
    "name": "教师公寓 5 栋",
    "building": "教师公寓 5 栋",
    "room": "教师公寓区",
    "x": 706,
    "y": 1504,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        687,
        1492
      ],
      [
        725,
        1492
      ],
      [
        725,
        1516
      ],
      [
        687,
        1516
      ]
    ],
    "teacher": true,
    "short": "5",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js6",
    "name": "教师公寓 6 栋",
    "building": "教师公寓 6 栋",
    "room": "教师公寓区",
    "x": 752,
    "y": 1504,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        733,
        1492
      ],
      [
        771,
        1492
      ],
      [
        771,
        1516
      ],
      [
        733,
        1516
      ]
    ],
    "teacher": true,
    "short": "6",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js7",
    "name": "教师公寓 7 栋",
    "building": "教师公寓 7 栋",
    "room": "教师公寓区",
    "x": 497,
    "y": 1462,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        478,
        1450
      ],
      [
        516,
        1450
      ],
      [
        516,
        1474
      ],
      [
        478,
        1474
      ]
    ],
    "teacher": true,
    "short": "7",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js8",
    "name": "教师公寓 8 栋",
    "building": "教师公寓 8 栋",
    "room": "教师公寓区",
    "x": 546,
    "y": 1462,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        527,
        1450
      ],
      [
        565,
        1450
      ],
      [
        565,
        1474
      ],
      [
        527,
        1474
      ]
    ],
    "teacher": true,
    "short": "8",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js9",
    "name": "教师公寓 9 栋",
    "building": "教师公寓 9 栋",
    "room": "教师公寓区",
    "x": 592,
    "y": 1462,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        573,
        1450
      ],
      [
        611,
        1450
      ],
      [
        611,
        1474
      ],
      [
        573,
        1474
      ]
    ],
    "teacher": true,
    "short": "9",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js10",
    "name": "教师公寓 10 栋",
    "building": "教师公寓 10 栋",
    "room": "教师公寓区",
    "x": 659,
    "y": 1462,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        640,
        1450
      ],
      [
        678,
        1450
      ],
      [
        678,
        1474
      ],
      [
        640,
        1474
      ]
    ],
    "teacher": true,
    "short": "10",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js11",
    "name": "教师公寓 11 栋",
    "building": "教师公寓 11 栋",
    "room": "教师公寓区",
    "x": 706,
    "y": 1462,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        687,
        1450
      ],
      [
        725,
        1450
      ],
      [
        725,
        1474
      ],
      [
        687,
        1474
      ]
    ],
    "teacher": true,
    "short": "11",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js12",
    "name": "教师公寓 12 栋",
    "building": "教师公寓 12 栋",
    "room": "教师公寓区",
    "x": 752,
    "y": 1462,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        733,
        1450
      ],
      [
        771,
        1450
      ],
      [
        771,
        1474
      ],
      [
        733,
        1474
      ]
    ],
    "teacher": true,
    "short": "12",
    "major": false,
    "labelWidth": 38
  },
  {
    "id": "js13",
    "name": "教师公寓 13 栋",
    "building": "教师公寓 13 栋",
    "room": "教师公寓区",
    "x": 656,
    "y": 1407,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        640,
        1396
      ],
      [
        672,
        1396
      ],
      [
        672,
        1418
      ],
      [
        640,
        1418
      ]
    ],
    "teacher": true,
    "short": "13",
    "major": false,
    "labelWidth": 32
  },
  {
    "id": "js14",
    "name": "教师公寓 14 栋",
    "building": "教师公寓 14 栋",
    "room": "教师公寓区",
    "x": 725,
    "y": 1407,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "校园西南角的教师住宅区，北邻北斗公寓。",
    "category": "dorm",
    "polygon": [
      [
        684,
        1396
      ],
      [
        766,
        1396
      ],
      [
        766,
        1418
      ],
      [
        684,
        1418
      ]
    ],
    "teacher": true,
    "short": "14",
    "major": false,
    "labelWidth": 82
  },
  {
    "id": "js15",
    "name": "教师公寓 15 栋",
    "building": "教师公寓 15 栋",
    "room": "教师公寓区",
    "x": 666,
    "y": 1363,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "紧挨北斗公寓南侧。",
    "category": "dorm",
    "polygon": [
      [
        638,
        1352
      ],
      [
        694,
        1352
      ],
      [
        694,
        1374
      ],
      [
        638,
        1374
      ]
    ],
    "teacher": true,
    "short": "15",
    "major": false,
    "labelWidth": 56
  },
  {
    "id": "js16",
    "name": "教师公寓 16 栋",
    "building": "教师公寓 16 栋",
    "room": "教师公寓区",
    "x": 737,
    "y": 1363,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "紧挨北斗公寓南侧。",
    "category": "dorm",
    "polygon": [
      [
        708,
        1352
      ],
      [
        766,
        1352
      ],
      [
        766,
        1374
      ],
      [
        708,
        1374
      ]
    ],
    "teacher": true,
    "short": "16",
    "major": false,
    "labelWidth": 58
  },
  {
    "id": "gate",
    "name": "校门",
    "building": "校门",
    "room": "航天大道主入口",
    "x": 977,
    "y": 1652,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "学校正门，面向航天大道。进门直行经过飞天广场就是明志楼。",
    "category": "life",
    "pin": [
      977,
      1652
    ],
    "teacher": false,
    "major": false,
    "labelWidth": 0
  },
  {
    "id": "cn",
    "name": "菜鸟驿站",
    "building": "菜鸟驿站",
    "room": "取快递",
    "x": 1360,
    "y": 1145,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "在天舟食堂东侧、后勤保障楼南面一带，去食堂吃饭时可以顺路取件。",
    "category": "life",
    "pin": [
      1360,
      1145
    ],
    "teacher": false,
    "major": false,
    "labelWidth": 0
  },
  {
    "id": "syq",
    "name": "思源桥",
    "building": "思源桥",
    "room": "跨水系小桥",
    "x": 812,
    "y": 1388,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "前进西路西侧水系上的小桥，连接西区与明志楼一带。",
    "category": "life",
    "pin": [
      812,
      1388
    ],
    "teacher": false,
    "major": false,
    "labelWidth": 0
  },
  {
    "id": "hj",
    "name": "去后街",
    "building": "去后街",
    "room": "沿川北路一直向西",
    "x": 478,
    "y": 1240,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "description": "从劝学楼、致远楼一带沿川北路往西走，经过图书馆和文汇楼，出西侧就是后街，吃饭逛街都在那边。",
    "category": "life",
    "pin": [
      478,
      1240
    ],
    "teacher": false,
    "major": false,
    "labelWidth": 0
  },
  {
    "id": "construction",
    "name": "二期扩建区",
    "building": "二期扩建区",
    "room": "二期扩建区域，暂不开放导航",
    "x": 540,
    "y": 620,
    "source": "用户提供：三星堆校区地图.zip / index.html",
    "closed": true,
    "polygon": [
      [
        90,
        400
      ],
      [
        880,
        330
      ],
      [
        860,
        400
      ],
      [
        772,
        690
      ],
      [
        772,
        898
      ],
      [
        462,
        898
      ],
      [
        462,
        1600
      ],
      [
        400,
        1600
      ]
    ]
  }
]
export const facultyHousing = campusPlaces.filter(p=>p.teacher)
export function findCampusPlace(building:string|null){return campusPlaces.find(p=>p.building===building)}
export function searchCampusPlaces(query:string){const term=query.replace(/\s/g,'').toLowerCase();return campusPlaces.filter(p=>(p.name+p.room).replace(/\s/g,'').toLowerCase().includes(term))}
