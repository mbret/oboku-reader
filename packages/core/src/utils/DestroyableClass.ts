import { Subject } from "rxjs"

export class DestroyableClass {
  private destroySubject = new Subject<void>()

  protected destroy$ = this.destroySubject.asObservable()

  public destroy() {
    this.destroySubject.next()
    this.destroySubject.complete()
  }
}
