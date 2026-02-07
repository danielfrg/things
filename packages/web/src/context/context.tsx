import { type Accessor, createContext, createMemo, type ParentProps, Show, useContext } from "solid-js"

export function createSimpleContext<T, Props extends Record<string, unknown> = Record<string, unknown>>(input: {
  name: string
  init: ((input: Props) => T) | (() => T)
  gate?: boolean
}) {
  const ctx = createContext<T>()

  return {
    provider: (props: ParentProps<Props>) => {
      const init = input.init(props)
      const gate = input.gate ?? true

      if (!gate) {
        return <ctx.Provider value={init}>{props.children}</ctx.Provider>
      }

      const isReady = createMemo(() => {
        // @ts-expect-error - ready may or may not exist
        const ready = init.ready as Accessor<boolean> | boolean | undefined
        return ready === undefined || (typeof ready === "function" ? ready() : ready)
      })
      return (
        <Show when={isReady()}>
          <ctx.Provider value={init}>{props.children}</ctx.Provider>
        </Show>
      )
    },
    use() {
      const value = useContext(ctx)
      if (!value) throw new Error(`${input.name} context must be used within a context provider`)
      return value
    },
  }
}
