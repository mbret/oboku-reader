import {
  FormControl,
  FormHelperText,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react"
import { useReaderSettings } from "./useReaderSettings"
import { useReader } from "../reader/useReader"

export const OtherSettings = () => {
  const settings = useReaderSettings()
  const { reader } = useReader()

  return (
    <FormControl as="fieldset" style={{ marginTop: 10 }}>
      <FormLabel as="legend">
        Number of adjacent spine items to pre-load
      </FormLabel>
      <FormHelperText mt={0} mb={2}>
        Help smoother the transition between pages and prevent blank (loading)
        page when turning. Note that pre-loading more page increase memory and
        CPU consumption
      </FormHelperText>
      <NumberInput
        value={settings?.numberOfAdjacentSpineItemToPreLoad ?? 0}
        onChange={(_, value) => {
          reader?.settings.update({
            numberOfAdjacentSpineItemToPreLoad: value,
          })
        }}
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </FormControl>
  )
}
