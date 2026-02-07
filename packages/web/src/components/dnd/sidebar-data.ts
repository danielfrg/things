// Project drag data
const projectKey: unique symbol = Symbol("project")

export type ProjectData = {
  [projectKey]: true
  projectId: string
  areaId: string | undefined
  rect: DOMRect
}

export function getProjectData(projectId: string, areaId: string | undefined, rect: DOMRect): ProjectData {
  return {
    [projectKey]: true,
    projectId,
    areaId,
    rect,
  }
}

export function isProjectData(data: Record<string | symbol, unknown>): data is ProjectData {
  return data[projectKey] === true
}

// Project drop target data (for reordering projects)
const projectDropKey: unique symbol = Symbol("project-drop")

export type ProjectDropData = {
  [projectDropKey]: true
  projectId: string
  areaId: string | undefined
}

export function getProjectDropData(projectId: string, areaId: string | undefined): ProjectDropData {
  return {
    [projectDropKey]: true,
    projectId,
    areaId,
  }
}

export function isProjectDropData(data: Record<string | symbol, unknown>): data is ProjectDropData {
  return data[projectDropKey] === true
}

// Area header drag data (for reordering areas)
const areaHeaderKey: unique symbol = Symbol("area-header")

export type AreaHeaderData = {
  [areaHeaderKey]: true
  areaId: string
  rect: DOMRect
}

export function getAreaHeaderData(areaId: string, rect: DOMRect): AreaHeaderData {
  return {
    [areaHeaderKey]: true,
    areaId,
    rect,
  }
}

export function isAreaHeaderData(data: Record<string | symbol, unknown>): data is AreaHeaderData {
  return data[areaHeaderKey] === true
}

// Area header drop target (for reordering areas)
const areaHeaderDropKey: unique symbol = Symbol("area-header-drop")

export type AreaHeaderDropData = {
  [areaHeaderDropKey]: true
  areaId: string
}

export function getAreaHeaderDropData(areaId: string): AreaHeaderDropData {
  return {
    [areaHeaderDropKey]: true,
    areaId,
  }
}

export function isAreaHeaderDropData(data: Record<string | symbol, unknown>): data is AreaHeaderDropData {
  return data[areaHeaderDropKey] === true
}

// Empty area drop zone (for dropping projects into empty areas or no-area)
const emptyAreaDropKey: unique symbol = Symbol("empty-area-drop")

export type EmptyAreaDropData = {
  [emptyAreaDropKey]: true
  areaId: string | undefined
}

export function getEmptyAreaDropData(areaId: string | undefined): EmptyAreaDropData {
  return {
    [emptyAreaDropKey]: true,
    areaId,
  }
}

export function isEmptyAreaDropData(data: Record<string | symbol, unknown>): data is EmptyAreaDropData {
  return data[emptyAreaDropKey] === true
}
