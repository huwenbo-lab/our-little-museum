/**
 * OUR LITTLE MUSEUM — 只修改这个文件，就能替换网站的文字与照片。
 * 所有日期、地点、故事均为示范占位，并非你们的真实经历。
 * 图片可以填 assets/你的文件名.jpg；照片文件放进 assets/ 即可。
 * 详细操作见 README.md。
 */
window.MUSEUM_CONTENT = {
  demoMode: true, // 素材都替换完成后，改为 false，页面右上角将不再显示 DEMO
  title: '我们的爱情博物馆',
  englishTitle: 'THE MUSEUM OF US',
  recipient: '给最特别的你',
  openingLine: '为你收藏时光，也为你留住花开。',
  openingNote: '一座属于我们的博物馆。故事还在继续，花也会一直开下去。',
  entryButton: '开启参观',
  curatorSignature: '一个想和你继续写故事的人',
  founded: 'EST. THE DAY WE MET',
  foyerNote: '这里收藏着我们经历过的时间、一起走过的地方，以及我留给你的一封信。第一期展览从这里开始，未来的故事还会慢慢加入。',
  // 建议按你们真实经历更改 event.title、event.date、event.story。
  // event.photos 可填多个照片路径，例如：['assets/2024-trip-01.jpg','assets/2024-trip-02.jpg']
  timeline: [
    { id:'beginning', no:'01', date:'日期待填写', title:'故事开始的那一天', subtitle:'THE FIRST PAGE', short:'第一次认识的故事，应该从哪里讲起？', story:'这里留给你写下第一次认识她的情景。你当时注意到了什么？后来再想起那一天，有没有什么和当时不一样的感觉？', cover:'assets/memory-beginning.svg', photos:[] },
    { id:'closer', no:'02', date:'日期待填写', title:'慢慢靠近的我们', subtitle:'GETTING CLOSER', short:'从普通的相识，到越来越重要。', story:'记录一次让你开始觉得彼此变得特别的相处：一句话、一顿饭，或者一个没有什么特别安排的下午。', cover:'assets/memory-walk.svg', photos:[] },
    { id:'journey', no:'03', date:'日期待填写', title:'一起出发的日子', subtitle:'SOMEWHERE TOGETHER', short:'有一些路，因为一起走过而不同。', story:'把你们某次共同旅行的真实故事写在这里。可以不写行程，只写你印象最深的一个小瞬间。', cover:'assets/memory-journey.svg', photos:[] },
    { id:'everyday', no:'04', date:'日期待填写', title:'平凡日子里的光', subtitle:'ORDINARY MAGIC', short:'值得收藏的，从来不只是重要日子。', story:'也许是一顿饭，也许是一起散步。写下一个看起来很平常、但你一直记得的瞬间。', cover:'assets/memory-everyday.svg', photos:[] },
    { id:'season', no:'05', date:'日期待填写', title:'我们一起经过的季节', subtitle:'OUR SEASONS', short:'日子向前走，回忆慢慢变多。', story:'在这里记录一段你们共同经历的变化，或者某件你们一起面对、一起完成的事情。', cover:'assets/memory-seasons.svg', photos:[] },
    { id:'today', no:'06', date:'现在', title:'直到今天，仍然是你', subtitle:'AND HERE WE ARE', short:'故事没有停在过去，它一直在发生。', story:'写下此时此刻，你最想让她知道的一件事。这是第一期展览的最后一件时间展品，但不是故事的最后一页。', cover:'assets/memory-today.svg', photos:[] }
  ],
  // 若后续要接入真实地图，可在这里加入坐标 lat、lng。
  // x、y 仅控制当前“回忆星图”中的视觉位置，不代表真实经纬度。
  places: [
    { id:'place-a', no:'01', name:'我们的起点', caption:'一个值得记住的地方', description:'在这里填入第一次见面、第一次约会，或对你们特别有意义的地点。', cover:'assets/place-beginning.svg', photos:[], x:23, y:61, lat:null, lng:null },
    { id:'place-b', no:'02', name:'一座共同走过的城市', caption:'一段路，一些风景', description:'换成你们旅行去过的城市，添加一段只有你们才记得的故事。', cover:'assets/place-city.svg', photos:[], x:51, y:33, lat:null, lng:null },
    { id:'place-c', no:'03', name:'想再去一次的地方', caption:'留给某个特别的瞬间', description:'不一定是远方，也可以是一家经常去的餐厅、一条街，或者一个公园。', cover:'assets/place-sea.svg', photos:[], x:77, y:67, lat:null, lng:null }
  ],
  // 以下内容是示范信件。务必在送出之前换成你自己的文字。
  letter: {
    preface: 'THE FINAL GALLERY · BUT NOT THE END',
    title: '写给你的，一封信',
    salutation: '亲爱的你：',
    paragraphs: [
      '我想为我们做一座小小的博物馆。你喜欢的芍药会在入口迎接你，而每一间展厅，都会慢慢装满我们真正经历过的故事。',
      '这封信还在等待被真正写下。这里最应该出现的，不是漂亮却陌生的句子，而是我想亲口告诉你的话。',
      '故事当然还没有写完。希望以后每年，我们都能带着新的照片、新的故事，回来为这座博物馆增添一间小小的展厅。'
    ],
    signature: '永远站在你这一边的人',
    postscript: '下一件藏品，等待我们一起创造。'
  }
};
