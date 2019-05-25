import { ipcRenderer } from "electron"
import { Notify, Dialog, Loading, LocalStorage } from "quasar"
import { EventEmitter } from "events"
import { SCEE } from "./SCEE-Node"
import { i18n, changeLanguage } from "src/plugins/i18n"

export class Gateway extends EventEmitter {
    constructor (app, router) {
        super()
        this.app = app
        this.router = router
        this.token = null
        this.scee = new SCEE()

        // Set the initial language
        let language = LocalStorage.has("language") ? LocalStorage.get.item("language") : "en-us"
        this.setLanguage(language)

        let theme = LocalStorage.has("theme") ? LocalStorage.get.item("theme") : "dark"
        this.app.store.commit("gateway/set_app_data", {
            config: {
                appearance: {
                    theme
                }
            }
        })
        this.app.store.watch(state => state.gateway.app.config.appearance.theme, (theme) => {
            LocalStorage.set("theme", theme)
        })

        this.closeDialog = false

        this.app.store.commit("gateway/set_app_data", {
            status: {
                code: 1 // Connecting to backend
            }
        })

        ipcRenderer.on("initialize", (event, data) => {
            this.token = data.token
            setTimeout(() => {
                this.ws = new WebSocket("ws://127.0.0.1:" + data.port)
                this.ws.addEventListener("open", () => { this.open() })
                this.ws.addEventListener("message", (e) => { this.receive(e.data) })
            }, 1000)
        })

        ipcRenderer.on("confirmClose", () => {
            this.confirmClose(i18n.t("dialog.exit.message"))
        })
    }

    open () {
        this.app.store.commit("gateway/set_app_data", {
            status: {
                code: 2 // Loading config
            }
        })
        this.send("core", "init")
    }

    confirmClose (msg, restart = false) {
        if (this.closeDialog) {
            return
        }
        this.closeDialog = true

        const key = restart ? "restart" : "exit"

        Dialog.create({
            title: i18n.t(`dialog.${key}.title`),
            message: msg,
            ok: {
                label: i18n.t(`dialog.${key}.ok`)
            },
            cancel: {
                flat: true,
                label: i18n.t("dialog.buttons.cancel"),
                color: this.app.store.state.gateway.app.config.appearance.theme == "dark" ? "white" : "dark"
            }
        }).then(() => {
            this.closeDialog = false
            Loading.hide()
            this.router.replace({ path: "/quit" })
            ipcRenderer.send("confirmClose", restart)
        }).catch(() => {
            this.closeDialog = false
        })
    }

    send (module, method, data = {}) {
        let message = {
            module,
            method,
            data
        }
        let encrypted_data = this.scee.encryptString(JSON.stringify(message), this.token)
        this.ws.send(encrypted_data)
    }

    receive (message) {
        // should wrap this in a try catch, and if fail redirect to error screen
        // shouldn't happen outside of dev environment
        let decrypted_data = JSON.parse(this.scee.decryptString(message, this.token))

        if (typeof decrypted_data !== "object" ||
            !decrypted_data.hasOwnProperty("event") ||
            !decrypted_data.hasOwnProperty("data")) { return }

        switch (decrypted_data.event) {
        case "set_language":
            const { lang } = decrypted_data.data
            this.setLanguage(lang)
            break
        case "set_has_password":
            this.emit("has_password", decrypted_data.data)
            break
        case "set_valid_address":
            this.emit("validate_address", decrypted_data.data)
            break
        case "set_app_data":
            this.app.store.commit("gateway/set_app_data", decrypted_data.data)
            break

        case "set_daemon_data":
            this.app.store.commit("gateway/set_daemon_data", decrypted_data.data)
            break

        case "set_wallet_data":
        case "set_wallet_error":
            this.app.store.commit("gateway/set_wallet_data", decrypted_data.data)
            break

        case "reset_wallet_error":
            this.app.store.dispatch("gateway/resetWalletStatus")
            break

        case "set_tx_status": {
            const data = { ...decrypted_data.data }

            if (data.i18n) {
                if (typeof data.i18n === "string") {
                    data.message = i18n.t(data.i18n)
                } else if (Array.isArray(data.i18n)) {
                    data.message = i18n.t(...data.i18n)
                }
            }
            this.app.store.commit("gateway/set_tx_status", data)
            break
        }

        case "set_snode_status":
            this.app.store.commit("gateway/set_snode_status", decrypted_data.data)
            break

        case "set_old_gui_import_status":
            this.app.store.commit("gateway/set_old_gui_import_status", decrypted_data.data)
            break

        case "wallet_list":
            this.app.store.commit("gateway/set_wallet_list", decrypted_data.data)
            break

        case "settings_changed_reboot":
            this.confirmClose(i18n.t("dialog.restart.message"), true)
            break

        case "show_notification": {
            let notification = {
                type: "positive",
                timeout: 1000,
                message: ""
            }
            const { data } = decrypted_data

            if (data.i18n) {
                if (typeof data.i18n === "string") {
                    notification.message = i18n.t(data.i18n)
                } else if (Array.isArray(data.i18n)) {
                    notification.message = i18n.t(...data.i18n)
                }
            }

            Notify.create(Object.assign(notification, data))
            break
        }

        case "show_loading":
            Loading.show({ ...(decrypted_data.data || {}) })
            break

        case "hide_loading":
            Loading.hide()
            break

        case "return_to_wallet_select":
            this.router.replace({ path: "/wallet-select" })
            setTimeout(() => {
                // short delay to prevent wallet data reaching the
                // websocket moments after we close and reset data
                this.app.store.dispatch("gateway/resetWalletData")
            }, 250)
            break
        }
    }

    setLanguage (lang) {
        changeLanguage(lang).then(() => {
            LocalStorage.set("language", lang)
        }).catch(() => {
            Notify.create({
                type: "negative",
                timeout: 2000,
                message: i18n.t("notification.errors.failedToSetLanguage", { lang })
            })
        })
    }
}
