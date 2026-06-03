import { statementOfFaithMn } from './statementOfFaithMn';

const statementOfFaithEn = {
  title: 'Statement of Faith',
  introBeforeLink: 'As members of the ',
  linkLabel: 'Southern Baptist Convention',
  introAfterLink: ', we believe',
  sections: [
    {
      title: 'The Scriptures',
      paragraphs: [
        "The Holy Bible was written by men divinely inspired and is God's revelation of Himself to man. It is a perfect treasure of divine instruction. It has God for its author, salvation for its end, and truth, without any mixture of error, for its matter. Therefore, all Scripture is totally true and trustworthy. It reveals the principles by which God judges us, and therefore is, and will remain to the end of the world the true center of Christian union, and the supreme standard by which all human conduct, creeds, and religious opinions should be tried. All Scripture is a testimony to Christ, who is Himself the focus of divine revelation.",
      ],
    },
    {
      title: 'God',
      paragraphs: [
        'There is one and only one living and true God. …The eternal triune God reveals Himself to us as Father, Son and Holy Spirit, with distinct personal attributes, but without division of nature, essence, or being.',
      ],
    },
    {
      title: 'God the Father',
      paragraphs: [
        "God as Father reigns with providential care over His universe, His creatures, and the flow of the stream of human history according to the purposes of His grace. …God is Father in truth to those who become children of God through faith in Jesus Christ.",
      ],
    },
    {
      title: 'God the Son',
      paragraphs: [
        'Christ is the eternal Son of God. In His incarnation as Jesus Christ, He was conceived of the Holy Spirit and born of the virgin Mary. …He honored the divine law by His personal obedience, and in His substitutionary death on the cross, He made provision for the redemption of men from sin.',
      ],
    },
    {
      title: 'God the Holy Spirit',
      paragraphs: [
        'The Holy Spirit is the Spirit of God, fully divine. …He exalts Christ. He convicts men of sin, of righteousness and of judgment. …He enlightens and empowers the believer and the church in worship, evangelism, and service.',
      ],
    },
    {
      title: 'Man',
      paragraphs: [
        'Man is the special creation of God, in His own image. He created them male and female as the crowning work of His creation. …By his free choice man sinned against God and brought sin into the human race. … The sacredness of human personality is evident in that God created man in His own image, and in that Christ died for man; therefore every person of every race possesses dignity and is worthy of respect and Christian love.',
      ],
    },
    {
      title: 'Salvation',
      paragraphs: [
        'Salvation involves the redemption of the whole man, and is offered freely to all who accept Jesus Christ as Lord and Saviour, who by His own blood obtained eternal redemption for the believer. In its broadest sense salvation includes regeneration, justification, sanctification, and glorification.',
      ],
    },
    {
      title: "God's Purpose of Grace",
      paragraphs: [
        'Election is the gracious purpose of God, according to which He regenerates, justifies, sanctifies, and glorifies sinners. …All true believers endure to the end. Those whom God has accepted in Christ, and sanctified by His Spirit will never fall away from the state of grace, but shall persevere to the end.',
      ],
    },
    {
      title: 'The Church',
      paragraphs: [
        "A New Testament church of the Lord Jesus Christ is an autonomous local congregation of baptized believers, associated by covenant in the faith and fellowship of the gospel, observing the two ordinances of Christ, governed by His laws, exercising the gifts, rights, and privileges invested in them by His Word, and seeking to extend the gospel to the ends of the earth. Each congregation operates under the Lordship of Christ through democratic processes. In such a congregation each member is responsible and accountable to Christ as Lord. Its scriptural officers are pastors and deacons. While both men and women are gifted for service in the church, the office of pastor is limited to men as qualified by Scripture.",
      ],
    },
    {
      title: "Baptism & the Lord's Supper",
      paragraphs: [
        "Christian baptism is the immersion of a believer in water. …It is an act of obedience symbolizing the believer's faith in a crucified, buried, and risen Saviour, the believer's death to sin, the burial of the old life, and the resurrection to walk in newness of life in Christ Jesus.",
        "The Lord's Supper is a symbolic act of obedience whereby members … memorialize the death of the Redeemer and anticipate His second coming.",
      ],
    },
    {
      title: 'Evangelism & Missions',
      paragraphs: [
        'It is the duty and privilege of every follower of Christ and every church of the Lord Jesus Christ to endeavor to make disciples of all nations... to seek constantly to win the lost to Christ by verbal witness undergirded by a Christian lifestyle, and by other methods in harmony with the gospel of Christ.',
      ],
    },
  ],
};

export function getStatementOfFaith(language) {
  if (language === 'mn') {
    return statementOfFaithMn;
  }
  return statementOfFaithEn;
}
