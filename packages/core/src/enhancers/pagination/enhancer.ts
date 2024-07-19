import { Observable, takeUntil } from "rxjs"
import { progressionEnhancer } from "../progression"
import { Report } from "../../report"
import { EnhancerOutput } from "../types/enhancer"
import { PaginationInfo } from "../../pagination/Pagination"
import { ExtraPaginationInfo } from "./types"
import { trackPaginationInfo } from "./pagination"
import { NAMESPACE } from "./constants"

type ProgressionEnhancer = typeof progressionEnhancer

const report = Report.namespace(NAMESPACE)

void report

export const paginationEnhancer =
  <
    InheritOptions,
    InheritOutput extends EnhancerOutput<ProgressionEnhancer>,
    PaginationOutput extends Omit<
      InheritOutput["pagination"],
      "paginationInfo$" | "getPaginationInfo"
    > & {
      paginationInfo$: Observable<PaginationInfo & ExtraPaginationInfo>
      getPaginationInfo: () => PaginationInfo & ExtraPaginationInfo
    },
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): Omit<InheritOutput, "pagination"> & {
    pagination: PaginationOutput
  } => {
    const reader = next(options)

    const { paginationInfo$, getPaginationInfo } = trackPaginationInfo(reader)

    paginationInfo$.pipe(takeUntil(reader.$.destroy$)).subscribe()

    return {
      ...reader,
      pagination: {
        ...reader.pagination,
        getPaginationInfo,
        paginationInfo$,
      } as unknown as PaginationOutput,
    }
  }
