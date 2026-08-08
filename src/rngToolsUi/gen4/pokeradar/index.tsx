import React from "react";
import { sortBy, uniq, uniqBy } from "lodash-es";
import { z } from "zod";
import {
  FormikNumberInput,
  FormikSelect,
  FormikRadio,
  FormikSwitch,
  MinMaxContainer,
  ResultColumn,
  RngToolForm,
  RngToolSubmit,
  Field,
  FormFieldTable,
} from "~/components";
import {
  multiWorkerRngTools,
  Nature,
  Gender,
  AbilityType,
  Ivs,
  SearchStatic4Opts,
  RadarShinyPatchResult,
  Patch,
} from "~/rngTools";
import { formatSpeciesLabel, species } from "~/types/species";
import { useWatch } from "~/hooks/form";
import { useBatchedTool } from "~/hooks/useBatchedTool";
import { chunkIvs } from "~/utils/chunkIvs";
import {
  getPkmFilterFields,
  getPkmFilterInitialValues,
  pkmFilterFieldsToRustInput,
  pkmFilterSchema,
} from "~/components/pkmFilter";
import { formatHex } from "~/utils/formatHex";
import { RustOption } from "~/types";
import { toOptions } from "~/utils/options";
import { leadAbilities } from "../gen4types";
import { DpPt, Gen3GameVersions } from "~/types/games";
import { getEncounters } from "~/rngToolsUi/gen4/encounters/wild";
import { ivColumns } from "~/rngToolsUi/shared/ivColumns";
import { BATTLE_RESULTS, TIMES, POKERADAR_ROUTES } from "./constants";

const Validator = z
  .object({
    game: z.enum(DpPt),
    tid: z.number().int().min(0).max(0xffff),
    sid: z.number().int().min(0).max(0xffff),
    minDelay: z.number().int().min(0),
    maxDelay: z.number().int().min(0),
    lead: z.enum(leadAbilities),
    minAdvanceSpread: z.number().int().min(0),
    maxAdvanceSpread: z.number().int().min(0),
    minAdvancePatch: z.number().int().min(0),
    maxAdvancePatch: z.number().int().min(0),
    route: z.enum(POKERADAR_ROUTES),
    species: z.enum(species),
    level: z.number().int().min(1).max(100),
    timeOfDay: z.enum(TIMES),
    swarmActive: z.boolean(),
    dualSlotGame: z.enum(Gen3GameVersions).nullable(),
    chainCount: z.number().int().min(0),
    battleResult: z.enum(BATTLE_RESULTS),
  })
  .extend(pkmFilterSchema.shape);

export type FormState = z.infer<typeof Validator>;

const initialValues: FormState = {
  game: "Diamond",
  tid: 0,
  sid: 0,
  minDelay: 700,
  maxDelay: 3000,
  lead: "None",
  minAdvanceSpread: 550,
  maxAdvanceSpread: 3000,
  minAdvancePatch: 300,
  maxAdvancePatch: 400,
  route: "Acuity Lakefront",
  species: "Snover",
  level: 5,
  timeOfDay: "day",
  swarmActive: false,
  dualSlotGame: null,
  chainCount: 40,
  battleResult: "Catch",
  ...getPkmFilterInitialValues(),
};

type ResultRow = {
  key: string;
  seed: number;
  advance: number;
  patchAdvance: number;
  pid: number;
  nature: Nature;
  ability: AbilityType;
  gender: Gender;
  level: number;
  delay: number;
  patches: Patch[];
} & Ivs;

const toResultRow = (result: RadarShinyPatchResult): ResultRow => ({
  key: `${result.state.seed}-${result.patch_advance}`,
  seed: result.state.seed,
  advance: result.state.advance,
  patchAdvance: result.patch_advance,
  pid: result.state.pid,
  nature: result.state.nature,
  ability: result.state.ability,
  gender: result.state.gender,
  ...result.state.ivs,
  level: result.state.level,
  delay: result.seed_time.delay,
  patches: result.patches,
});

const columns: ResultColumn<ResultRow>[] = [
  {
    title: "Seed",
    dataIndex: "seed",
    monospace: true,
    render: (value) => formatHex(value),
  },
  { title: "Patch Advance", dataIndex: "patchAdvance" },
  { title: "Spread Advance", dataIndex: "advance" },
  { title: "Delay", dataIndex: "delay" },
  {
    title: "PID",
    dataIndex: "pid",
    monospace: true,
    render: (value) => formatHex(value),
  },
  { title: "Nature", dataIndex: "nature" },
  { title: "Ability", dataIndex: "ability" },
  { title: "Gender", dataIndex: "gender" },
  ...ivColumns,
  { title: "Level", dataIndex: "level" },
];

const FormContent = () => {
  const { game, route, species, timeOfDay, swarmActive, dualSlotGame } =
    useWatch({
      validationSchema: Validator,
      names: {
        game: true,
        route: true,
        species: true,
        timeOfDay: true,
        swarmActive: true,
        dualSlotGame: true,
      },
    });

  const encounters =
    game == null || route == null || timeOfDay == null || swarmActive == null
      ? []
      : getEncounters({
          game,
          location: route,
          timeOfDay,
          swarmActive,
          dualSlotCartridge: dualSlotGame ?? null,
          radarActive: false,
        });

  const encounterLevels = encounters
    .filter((enc) => enc.species === species)
    .flatMap((enc) => [enc.minLevel, enc.maxLevel]);
  const levelOptions = sortBy(
    toOptions(uniq(encounterLevels)),
    (opt) => opt.label,
  );

  const uniqueSpecies = uniqBy(encounters, ({ species }) => species);
  const speciesOptions = uniqueSpecies.map(({ species }) => ({
    label: formatSpeciesLabel(species),
    value: species,
  }));

  const staticFields: Field[] = [
    {
      label: "Game",
      input: (
        <FormikSelect<FormState, "game">
          name="game"
          options={toOptions(DpPt)}
        />
      ),
    },
    {
      label: "TID / SID",
      input: (
        <MinMaxContainer
          min={<FormikNumberInput<FormState> name="tid" numType="decimal" />}
          max={<FormikNumberInput<FormState> name="sid" numType="decimal" />}
        />
      ),
    },
    {
      label: "Route",
      input: (
        <FormikSelect<FormState, "route">
          name="route"
          options={sortBy(toOptions(POKERADAR_ROUTES), (opt) => opt.label)}
        />
      ),
    },
    {
      label: "Time",
      input: (
        <FormikSelect<FormState, "timeOfDay">
          name="timeOfDay"
          options={[
            { label: "Day", value: "day" },
            { label: "Night", value: "night" },
          ]}
        />
      ),
    },
    {
      label: "Swarm",
      input: <FormikSwitch<FormState> name="swarmActive" />,
    },
    {
      label: "Dual Slot Game",
      input: (
        <FormikSelect<FormState, "dualSlotGame">
          name="dualSlotGame"
          options={[
            { label: "None", value: null },
            ...toOptions(Gen3GameVersions),
          ]}
        />
      ),
    },
    {
      label: "Species",
      input: (
        <FormikSelect<FormState, "species">
          name="species"
          options={speciesOptions}
        />
      ),
    },
    {
      label: "Level",
      input: <FormikRadio<FormState> name="level" options={levelOptions} />,
    },
    {
      label: "Lead",
      input: (
        <FormikSelect<FormState, "lead">
          name="lead"
          options={toOptions(leadAbilities)}
        />
      ),
    },
    {
      label: "Delay",
      input: (
        <MinMaxContainer
          min={
            <FormikNumberInput<FormState> name="minDelay" numType="decimal" />
          }
          max={
            <FormikNumberInput<FormState> name="maxDelay" numType="decimal" />
          }
        />
      ),
    },
    {
      label: "Advance (spread)",
      input: (
        <MinMaxContainer
          min={
            <FormikNumberInput<FormState>
              name="minAdvanceSpread"
              numType="decimal"
            />
          }
          max={
            <FormikNumberInput<FormState>
              name="maxAdvanceSpread"
              numType="decimal"
            />
          }
        />
      ),
    },
    {
      label: "Advance (shiny patch)",
      input: (
        <MinMaxContainer
          min={
            <FormikNumberInput<FormState>
              name="minAdvancePatch"
              numType="decimal"
            />
          }
          max={
            <FormikNumberInput<FormState>
              name="maxAdvancePatch"
              numType="decimal"
            />
          }
        />
      ),
    },
    {
      label: "Battle Result",
      input: (
        <FormikSelect<FormState, "battleResult">
          name="battleResult"
          options={toOptions(BATTLE_RESULTS)}
        />
      ),
    },
  ];

  const otherFilterFields = getPkmFilterFields<FormState>({
    species: species ?? undefined,
    displayShiny: false,
  });

  return <FormFieldTable fields={[...staticFields, ...otherFilterFields]} />;
};

export const PokeRadar4ShinySearcher = () => {
  const {
    run: searchShinyPatches,
    data: results,
    progressPercent,
    cancel,
  } = useBatchedTool(multiWorkerRngTools.search_shiny_patches_range, {
    map: toResultRow,
  });

  const filteredResults = React.useMemo(
    () => results.filter((res) => res.patchAdvance < res.advance),
    [results],
  );

  const onSubmit: RngToolSubmit<FormState> = async (opts) => {
    const baseSearch: Omit<RustOption<SearchStatic4Opts>, "filter"> = {
      tid: opts.tid,
      sid: opts.sid,
      species: opts.species,
      offset: 0,
      encounter_min_level: opts.level,
      encounter_max_level: opts.level,
      min_advance: opts.minAdvanceSpread,
      max_advance: opts.maxAdvanceSpread,
      min_delay: opts.minDelay,
      max_delay: opts.maxDelay,
      year: 2000,
      month: null,
      force_second: null,
      lead: opts.lead,
      method: "ShinyRadar",
    };

    const chunkedIvs = chunkIvs(opts.filter_min_ivs, opts.filter_max_ivs);
    const searchOptsChunks = chunkedIvs.map(([minIvs, maxIvs]) => ({
      search: {
        ...baseSearch,
        filter: {
          ...pkmFilterFieldsToRustInput({ ...opts, filter_shiny: true }),
          min_ivs: minIvs,
          max_ivs: maxIvs,
        },
      },
      patch_min_advance: opts.minAdvancePatch,
      patch_max_advance: opts.maxAdvancePatch,
      chain_count: opts.chainCount,
      battle_result: opts.battleResult,
      selected_shake: "Slow" as const,
    }));

    await searchShinyPatches(searchOptsChunks);
  };

  return (
    <RngToolForm<FormState, ResultRow>
      columns={columns}
      results={filteredResults}
      initialValues={initialValues}
      validationSchema={Validator}
      onSubmit={onSubmit}
      rowKey="key"
      submitTrackerId="search_gen4_radar_shiny_patches"
      allowCancel
      cancelTrackerId="cancel_gen4_radar_shiny_patches"
      onCancel={cancel}
      progressPercent={progressPercent}
    >
      <FormContent />
    </RngToolForm>
  );
};
