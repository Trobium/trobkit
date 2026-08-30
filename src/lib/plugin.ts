import { Trobkit } from '../trobkit.js';
import utils from '../utils/index.js';
import semver from 'semver';

interface PluginConstructorOptions {
    disablePlugins?: boolean;
}

interface PluginClassInterface {
    new(trobkit: Trobkit): {
        pluginInterface?: (options: PluginOptions) => PluginInterfaceReturn;
    };
}

interface PluginInterfaceReturn {
    requires: string;
    components?: Record<string | number | symbol, any>;
    fullClass?: boolean;
}

type PluginOptions = any;

// TODO: Plugin support will be removed in the next major version.
const PROTECTED_MODULES = ['transactionBuilder', 'plugin'];

// Signing and key management methods are always protected regardless of component.
const PROTECTED_METHODS = ['sign', 'signMessage', 'signMessageV2', 'signTransaction', 'signTypedData', 'multiSign', 'setPrivateKey', 'ecRecover'];

export class Plugin {
    trobkit: Trobkit;
    pluginNoOverride: string[];
    disablePlugins: boolean;

    constructor(trobkit: Trobkit, options: PluginConstructorOptions = {}) {
        if (!trobkit || !(trobkit instanceof Trobkit)) throw new Error('Expected instance of Trobkit');
        this.trobkit = trobkit;
        this.pluginNoOverride = ['register'];
        this.disablePlugins = !!options.disablePlugins;
    }

    register(Plugin: PluginClassInterface, options?: PluginOptions) {
        let pluginInterface: PluginInterfaceReturn = {
            requires: '0.0.0',
            components: {},
        };
        const result: {
            libs: any[];
            plugged: any[];
            skipped: any[];
            error?: string;
        } = {
            libs: [],
            plugged: [],
            skipped: [],
            error: undefined,
        };
        if (this.disablePlugins) {
            result.error = 'This instance of Trobkit has plugins disabled.';
            return result;
        }
        const plugin = new Plugin(this.trobkit);
        if (utils.isFunction(plugin.pluginInterface)) {
            pluginInterface = plugin.pluginInterface(options);
        }
        if (semver.satisfies(Trobkit.version, pluginInterface.requires)) {
            if (pluginInterface.fullClass) {
                // plug the entire class at the same level of trobkit.trob
                const className = plugin.constructor.name;
                const classInstanceName = className.substring(0, 1).toLowerCase() + className.substring(1);
                if (className !== classInstanceName) {
                    Object.assign(Trobkit, {
                        [className]: Plugin,
                    });
                    Object.assign(this.trobkit, {
                        [classInstanceName]: plugin,
                    });
                    result.libs.push(className);
                }
            } else {
                // plug methods into a class, like trob
                for (const component in pluginInterface.components) {
                    if (PROTECTED_MODULES.includes(component)) {
                        console.warn(
                            `[Trobkit] Plugin attempted to override protected module "${component}", which is not allowed. Plugin support will be removed in the next major version.`
                        );
                        result.skipped.push(component);
                        continue;
                    }
                    // eslint-disable-next-line no-prototype-builtins
                    if (!this.trobkit.hasOwnProperty(component)) {
                        continue;
                    }
                    const methods = pluginInterface.components[component];
                    const pluginNoOverride = (this.trobkit as any)[component].pluginNoOverride || [];
                    for (const method in methods) {
                        if (
                            method === 'constructor' ||
                            PROTECTED_METHODS.includes(method) || // globally protected methods
                            ((this.trobkit as any)[component][method] &&
                                (pluginNoOverride.includes(method) || // blacklisted methods
                                    /^_/.test(method))) // private methods
                        ) {
                            result.skipped.push(method);
                            continue;
                        }
                        (this.trobkit as any)[component][method] = methods[method].bind((this.trobkit as any)[component]);
                        result.plugged.push(method);
                    }
                }
            }
        } else {
            throw new Error('The plugin is not compatible with this version of Trobkit');
        }
        return result;
    }
}
