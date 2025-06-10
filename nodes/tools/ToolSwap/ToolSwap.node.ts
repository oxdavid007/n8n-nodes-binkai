/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { DynamicTool } from '@langchain/core/tools';
import { OnchainToolName } from '../../../utils/toolName';
import { SupportChain } from '../../../utils/networks';
import { SwapPlugin } from '@binkai/swap-plugin';
import { KyberProvider } from '@binkai/kyber-provider';
import { JupiterProvider } from '@binkai/jupiter-provider';
import { OkuProvider } from '@binkai/oku-provider';
import { ThenaProvider } from '@binkai/thena-provider';
import { Connection } from '@solana/web3.js';
import { ethers } from 'ethers';

const bnbPotocolsTypeProperties: INodeProperties[] = [
	{
		displayName: 'BNB Swap Protocols',
		name: 'bnbSwapProtocols',
		type: 'multiOptions',
		description: 'The swap protocols to use for the agent. You can select multiple protocols.',
		options: [
			{
				name: 'Kyber',
				value: 'kyber',
			},
			{
				name: 'OKU',
				value: 'oku',
			},
			{
				name: 'Thena',
				value: 'thena',
			},
		],
		required: true,
		default: 'kyber',
	},
];

const solanaPotocolsTypeProperties: INodeProperties[] = [
	{
		displayName: 'Solana Swap Protocols',
		name: 'solanaSwapProtocols',
		type: 'multiOptions',
		description: 'The swap protocols to use for the agent. You can select multiple protocols.',
		options: [
		{
			name: 'Jupiter',
			value: 'jupiter',
		},
	],
		required: true,
		default: 'jupiter',
	},
];

export class ToolSwap implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bink AI Swap Tool',
		name: OnchainToolName.SWAP_TOOL,
		icon: 'file:../../icons/swap_bink_ai.svg',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Make it easier for AI agents to perform arithmetic',
		defaults: {
			name: 'BinkAI Swap',
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
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
			...bnbPotocolsTypeProperties,
			...solanaPotocolsTypeProperties,
			{
				displayName:
					'This tool helps you swap tokens on blockchain networks. It will use AI to determine these parameters from your input:<br><br>' +
					'&nbsp;&nbsp; - <strong>fromToken</strong> - Address of source token to spend<br>' +
					'&nbsp;&nbsp; - <strong>toToken</strong> - Address of destination token to receive<br>' +
					'&nbsp;&nbsp; - <strong>amount</strong> - Amount of tokens to swap<br>' +
					'&nbsp;&nbsp; - <strong>limitPrice</strong> - Price limit for the swap order (optional)<br>' +
					'&nbsp;&nbsp; - <strong>amountType</strong> - Whether amount is input (spend) or output (receive)<br>' +
					'&nbsp;&nbsp; - <strong>network</strong> - Blockchain network (bnb, solana, ethereum)<br>' +
					'&nbsp;&nbsp; - <strong>provider</strong> - DEX provider to use (optional, will find best rate if not specified)<br>' +
					'&nbsp;&nbsp; - <strong>slippage</strong> - Maximum slippage percentage allowed (optional)<br><br>' +
					'Use this tool to execute token swaps across different blockchain networks and DEX providers.',
				name: 'notice_tip',
				type: 'notice',
				default: '',
			},
		],
		credentials: [
			{
				name: 'binkaiCredentialsApi',
				displayName: 'Binkai Swap RPC URLs',
				required: true,
			},
		],
	};

    

	public static swapPlugin?: SwapPlugin;
	
	async getSwapPlugin(): Promise<any> {
		return ToolSwap.swapPlugin;
	}

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		this.logger.info('Supplying data for ToolSwap for BinkAIs');

		const bnbSwapProtocols = this.getNodeParameter('bnbSwapProtocols', 0) as string[];
		const solanaSwapProtocols = this.getNodeParameter('solanaSwapProtocols', 0) as string[];


		const baseCredentials = await this.getCredentials('binkaiCredentialsApi');

		const RPC_URLS = {
			BNB: baseCredentials.bnbRpcUrl as string,
			ETH: baseCredentials.ethRpcUrl as string,
			SOL: baseCredentials.solRpcUrl as string,
		};

		const providers = {
			bsc: new ethers.JsonRpcProvider(RPC_URLS.BNB),
			solana: new Connection(RPC_URLS.SOL),
		};

		const protocolMap = {
			kyber: () => new KyberProvider(providers.bsc, 56),
			oku: () => new OkuProvider(providers.bsc, 56),
			thena: () => new ThenaProvider(providers.bsc, 56),
			jupiter: () => new JupiterProvider(providers.solana),
		};

		const swapProtocols = [
			...bnbSwapProtocols.filter(protocol => protocol in protocolMap).map(protocol => protocolMap[protocol as keyof typeof protocolMap]()),
			...solanaSwapProtocols.filter(protocol => protocol in protocolMap).map(protocol => protocolMap[protocol as keyof typeof protocolMap]())
		];
	
		const swapPlugin = new SwapPlugin();
		await swapPlugin.initialize({
			defaultSlippage: 0.5,
			defaultChain: SupportChain.BNB,
			providers: swapProtocols,
			supportedChains: [SupportChain.BNB, SupportChain.ETHEREUM, SupportChain.SOLANA],
		});
		ToolSwap.swapPlugin = swapPlugin;
		const tool = new DynamicTool({
			name: OnchainToolName.SWAP_TOOL,
			description: 'Swap tool for BinkAI',
			func: async (subject: string) => {
				return subject;
			},
		});

		return {
			response: logWrapper(tool, this),
		};
	}
}
