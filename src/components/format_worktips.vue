<template>
<span>
    {{ value }} WTIP
</span>
</template>

<script>
export default {
    name: "FormatWorktips",
    props: {
        amount: {
            required: true
        },
        round: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    computed: {
        value () {
            let value = this.amount / 1e8
            if(this.round)
                value = value.toFixed(3)
            return value.toLocaleString()
        }

    }
}
</script>

<style>
</style>
