<template>
<q-page>
    <div class="row q-pt-sm q-mx-md q-mb-sm items-end non-selectable">

        <div class="col-5">
            {{ $t("titles.transactions") }}
        </div>

        <WorktipsField class="col-5 q-px-sm" :label="$t('fieldLabels.filterTxId')">
            <q-input v-model="tx_txid"
                     :dark="theme=='dark'"
                     :placeholder="$t('placeholders.enterAnId')"
                     hide-underline
                     />
        </WorktipsField>

        <WorktipsField class="col-2" :label="$t('fieldLabels.filterTransactionType')">
            <q-select :dark="theme=='dark'"
                      v-model="tx_type"
                      :options="tx_type_options"
                      hide-underline
                      />
        </WorktipsField>

    </div>
    <TxList :type="tx_type" :txid="tx_txid" />
</q-page>
</template>

<script>
import { mapState } from "vuex"
import TxList from "components/tx_list"
import WorktipsField from "components/worktips_field"
export default {
    data () {
        return {
            tx_type: "all",
            tx_txid: "",
            tx_type_options: [
                {label: this.$t("strings.transactions.types.all"), value: "all"},
                {label: this.$t("strings.transactions.types.incoming"), value: "in"},
                {label: this.$t("strings.transactions.types.outgoing"), value: "out"},
                {label: this.$t("strings.transactions.types.pending"), value: "all_pending"},
                {label: this.$t("strings.transactions.types.miner"), value: "miner"},
                {label: this.$t("strings.transactions.types.serviceNode"), value: "snode"},
                {label: this.$t("strings.transactions.types.governance"), value: "gov"},
                {label: this.$t("strings.transactions.types.stake"), value: "stake"},
                {label: this.$t("strings.transactions.types.failed"), value: "failed"},
            ]

        }
    },
    computed: mapState({
        theme: state => state.gateway.app.config.appearance.theme,
        tx_list: state => state.gateway.wallet.transactions.tx_list
    }),
    components: {
        TxList,
        WorktipsField
    }
}
</script>

<style lang="scss">
</style>
