/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type INodeType,
	type INodeProperties,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';

import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { DynamicTool } from '@langchain/core/tools';
import { OnchainToolName } from '../../../utils/toolName';
import { SupportChain } from '../../../utils/networks';
import { WalletPlugin } from '@binkai/wallet-plugin';
import { BirdeyeProvider } from '@binkai/birdeye-provider';
import { AlchemyProvider } from '@binkai/alchemy-provider';
import { SolanaProvider } from '@binkai/rpc-provider';
import { BnbProvider } from '@binkai/rpc-provider';



export class ToolTransfer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bink AI Transfer Tool',
		name: OnchainToolName.TRANSFER_TOOL,
		icon: 'file:../../icons/transfer_bink_ai.svg',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Make it easier for AI agents to perform transfer',
		defaults: {
			name: 'BinkAI Transfer',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Bink AI Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://bink.ai',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			{
				displayName:
					'This tool helps you get blockchain token information. It will use AI to determine these parameters from your input:<br><br>' +
					'&nbsp;&nbsp; - <strong>query</strong> - Token address or symbol to search for (e.g., "BTC", "0x123...")<br>' +
					'&nbsp;&nbsp; - <strong>network</strong> - Blockchain network (bnb, solana, ethereum, arbitrum, base, optimism, polygon)<br>' +
					'&nbsp;&nbsp; - <strong>provider</strong> - Data provider to use (optional, will try all if not specified)<br>' +
					'&nbsp;&nbsp; - <strong>includePrice</strong> - Include price data in response (optional, default: true)<br><br>' +
					'Use this tool to retrieve token details, prices, and metadata across different blockchain networks.',
				name: 'notice_tip',
				type: 'notice',
				default: '',
			},
			// ...protocolsTypeProperties,
		],
        credentials: [
			{
				name: 'binkaiCredentialsApi',
				displayName: 'Binkai Transfer RPC URLs',
				required: true,
			},
			
		],
	};

	private static transferPlugin?: WalletPlugin;
	

	async getTransferPlugin(): Promise<any> {
		return ToolTransfer.transferPlugin;
	}


	async supplyData(this: ISupplyDataFunctions): Promise<any> {
		this.logger.info('Supplying data for ToolToken for BinkAIs');
        const transferCredentials = await this.getCredentials('binkaiCredentialsApi');

        const bnbProvider = new BnbProvider({
			rpcUrl: transferCredentials.bnbRpcUrl as string,
		});

		const solanaProvider = new SolanaProvider({
			rpcUrl: transferCredentials.solRpcUrl as string,
		});

        const walletPlugin = new WalletPlugin();
		await walletPlugin.initialize({
			defaultChain: SupportChain.BNB,
			providers: [bnbProvider, solanaProvider],
		});
		
		const tool = new DynamicTool({
			name: OnchainToolName.TRANSFER_TOOL,
			description: 'Transfer tool for BinkAI',
			func: async (subject: string) => {
				return subject;
			},
		});
		
		return {
			response: logWrapper(tool, this),
		};
	}
}