import { randomUUID } from 'crypto'
import { Message } from 'node-rdkafka'

import { insertRow } from '~/tests/helpers/sql'

import { ClickHouseTimestamp, ProjectId, RawClickHouseEvent, Team } from '../../types'
import { PostgresRouter } from '../../utils/db/postgres'
import { UUIDT } from '../../utils/utils'
import { CdpInternalEvent } from '../schema'
import {
    HogFunctionInvocation,
    HogFunctionInvocationGlobals,
    HogFunctionInvocationGlobalsWithInputs,
    HogFunctionType,
    IntegrationType,
} from '../types'

export const createHogFunction = (hogFunction: Partial<HogFunctionType>) => {
    const item: HogFunctionType = {
        id: randomUUID(),
        type: 'destination',
        name: 'Hog Function',
        team_id: 1,
        enabled: true,
        hog: '',
        bytecode: [],
        ...hogFunction,
    } as HogFunctionType

    return item
}

export const createIntegration = (integration: Partial<IntegrationType>) => {
    const item: IntegrationType = {
        team_id: 1,
        errors: '',
        created_at: new Date().toISOString(),
        created_by_id: 1001,
        id: integration.id ?? 1,
        kind: integration.kind ?? 'slack',
        config: {},
        sensitive_config: {},
        ...integration,
    }

    return item
}

export const createIncomingEvent = (teamId: number, data: Partial<RawClickHouseEvent>): RawClickHouseEvent => {
    return {
        team_id: teamId,
        project_id: teamId as ProjectId,
        created_at: new Date().toISOString() as ClickHouseTimestamp,
        elements_chain: '[]',
        person_created_at: new Date().toISOString() as ClickHouseTimestamp,
        person_properties: '{}',
        distinct_id: 'distinct_id_1',
        uuid: randomUUID(),
        event: '$pageview',
        timestamp: new Date().toISOString() as ClickHouseTimestamp,
        properties: '{}',
        person_mode: 'full',
        ...data,
    }
}

export const createKafkaMessage = (event: any, overrides: Partial<Message> = {}): Message => {
    return {
        partition: 1,
        topic: 'test',
        offset: 0,
        timestamp: overrides.timestamp ?? Date.now(),
        size: 1,
        ...overrides,
        value: Buffer.from(JSON.stringify(event)),
    }
}

export const createInternalEvent = (teamId: number, data: Partial<CdpInternalEvent>): CdpInternalEvent => {
    return {
        team_id: teamId,
        event: {
            timestamp: new Date().toISOString(),
            properties: {},
            uuid: randomUUID(),
            event: '$pageview',
            distinct_id: 'distinct_id',
        },
        ...data,
    }
}

export const insertHogFunction = async (
    postgres: PostgresRouter,
    team_id: Team['id'],
    hogFunction: Partial<HogFunctionType> = {}
): Promise<HogFunctionType> => {
    // This is only used for testing so we need to override some values

    const res = await insertRow(postgres, 'posthog_hogfunction', {
        ...createHogFunction({
            ...hogFunction,
            team_id: team_id,
        }),
        description: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by_id: 1001,
        deleted: false,
    })
    return res
}

export const insertIntegration = async (
    postgres: PostgresRouter,
    team_id: Team['id'],
    integration: Partial<IntegrationType> = {}
): Promise<IntegrationType> => {
    const res = await insertRow(
        postgres,
        'posthog_integration',
        createIntegration({
            ...integration,
            team_id: team_id,
        })
    )
    return res
}

export const createHogExecutionGlobals = (
    data: Partial<HogFunctionInvocationGlobals> = {}
): HogFunctionInvocationGlobals => {
    return {
        groups: {},
        ...data,
        person: {
            id: 'uuid',
            name: 'test',
            url: 'http://localhost:8000/persons/1',
            properties: {
                email: 'test@posthog.com',
                first_name: 'Pumpkin',
            },
            ...(data.person ?? {}),
        },
        project: {
            id: 1,
            name: 'test',
            url: 'http://localhost:8000/projects/1',
            ...(data.project ?? {}),
        },
        event: {
            uuid: 'uuid',
            event: 'test',
            elements_chain: '',
            distinct_id: 'distinct_id',
            url: 'http://localhost:8000/events/1',
            properties: {
                $lib_version: '1.2.3',
            },
            timestamp: new Date().toISOString(),
            ...(data.event ?? {}),
        },
    }
}

export const createInvocation = (
    _hogFunction: Partial<HogFunctionType> = {},
    _globals: Partial<HogFunctionInvocationGlobals> = {}
): HogFunctionInvocation => {
    const hogFunction = createHogFunction(_hogFunction)
    // Add the source of the trigger to the globals

    const globals = createHogExecutionGlobals(_globals)
    globals.source = {
        name: hogFunction.name ?? `Hog function: ${hogFunction.id}`,
        url: `${globals.project.url}/pipeline/destinations/hog-${hogFunction.id}/configuration/`,
    }

    return {
        id: new UUIDT().toString(),
        // NOTE: This is due to some legacy code that checks for inputs and uses it. BW will fix later.
        globals: globals as HogFunctionInvocationGlobalsWithInputs,
        teamId: hogFunction.team_id,
        hogFunction,
        queue: 'hog',
        timings: [],
        queuePriority: 0,
    }
}

const SAMPLE_GLOBALS = {
    event: {
        uuid: 'uuid',
        event: 'test',
        distinct_id: 'distinct_id',
        properties: {
            email: 'test@posthog.com',
        },
        elements_chain: '',
        timestamp: '',
        url: '',
    },
    project: {
        id: 1,
        name: 'test',
        url: 'http://localhost:8000/projects/1',
    },
}

export const createSegmentInvocation = (
    _hogFunction: Partial<HogFunctionType> = {},
    inputs: Record<string, any> = {}
): HogFunctionInvocation => {
    const hogFunction = createHogFunction(_hogFunction)

    return {
        id: new UUIDT().toString(),
        globals: {
            inputs,
            ...SAMPLE_GLOBALS,
        },
        teamId: hogFunction.team_id,
        hogFunction,
        queue: 'segment',
        timings: [],
        queuePriority: 0,
    }
}
