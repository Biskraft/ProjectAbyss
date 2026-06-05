export function deferElementFocus(element: HTMLElement): void {
  setTimeout(() => element.focus(), 0);
}
