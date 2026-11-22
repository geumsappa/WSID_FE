// 화면을 브라우저 인쇄 창으로 열어 "PDF로 저장"할 수 있게 해요.
// 인쇄 창의 기본 파일 이름은 문서 제목(document.title)을 따라서, 잠깐 리포트 제목으로 바꿨다가 되돌려요.
export function printAsPdf(fileTitle: string) {
  const prev = document.title
  document.title = fileTitle.replace(/[\\/:*?"<>|]/g, " ").trim() || prev
  window.print() // 인쇄 창이 닫힐 때까지 기다려요
  document.title = prev
}
