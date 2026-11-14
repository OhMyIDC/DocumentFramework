export interface ContainerToken {
  nesting: number
  info: string
}

export interface ContainerOptions {
  validate?: (params: string) => boolean
  render?: (
    tokens: ContainerToken[],
    index: number,
    options: unknown,
    env: unknown,
    self: unknown,
  ) => string
}

declare const container: (md: unknown, name: string, options?: ContainerOptions) => void
export default container
