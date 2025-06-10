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
import { Connection } from '@solana/web3.js';
import { ethers } from 'ethers';
import { StakingPlugin } from '@binkai/staking-plugin';
import { KernelDaoProvider } from '@binkai/kernel-dao-provider';
import { ListaProvider } from '@binkai/lista-provider';
import { VenusProvider } from '@binkai/venus-provider';



const stakingPotocolsTypeProperties: INodeProperties[] = [
	{
		displayName: 'Staking Protocols',
		name: 'stakingProtocols',
		type: 'multiOptions',
		description: 'The staking protocols to use for the agent. You can select multiple protocols.',
		options: [
		{
			name: 'Venus',
			value: 'venus',
		},
		{
			name: 'Kernel DAO',
			value: 'kernelDao',
		},
		{
			name: 'Lista',
			value: 'lista',
		},
	],
		required: true,
		default: 'kernelDao',
	},
];

export class ToolStaking implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bink AI Staking Tool',
		name: OnchainToolName.STAKING_TOOL,
		icon: 'file:../../icons/staking_bink_ai.svg',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Make it easier for AI agents to perform staking',
		defaults: {
			name: 'BinkAI Staking',
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
			...stakingPotocolsTypeProperties,
			{
				displayName:
					'This tool helps you stake tokens on blockchain networks. It will use AI to determine these parameters from your input:<br><br>' +
					'&nbsp;&nbsp; - <strong>token</strong> - Address of token to stake<br>' +
					'&nbsp;&nbsp; - <strong>amount</strong> - Amount of tokens to stake<br>' +
					'&nbsp;&nbsp; - <strong>action</strong> - Staking action (stake, unstake, claim rewards)<br>' +
					'&nbsp;&nbsp; - <strong>provider</strong> - Staking protocol to use (Venus, Kernel DAO, Lista)<br>' +
					'&nbsp;&nbsp; - <strong>network</strong> - Blockchain network (currently supports BNB Chain)<br>' +
					'&nbsp;&nbsp; - <strong>duration</strong> - Staking period (if applicable)<br><br>' +
					'Use this tool to stake tokens, earn rewards, and manage your staking positions across different DeFi protocols.',
				name: 'notice_tip',
				type: 'notice',
				default: '',
			},
		],
	};

    

	public static stakingPlugin?: StakingPlugin;
	
	async getStakingPlugin(): Promise<any> {
		return ToolStaking.stakingPlugin;
	}

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		this.logger.info('Supplying data for ToolSwap for BinkAIs');
        const BNB_RPC = 'https://bsc-dataseed1.binance.org';
        const provider = new ethers.JsonRpcProvider(BNB_RPC);

        const registeredProtocols = this.getNodeParameter('stakingProtocols', 0) as string[];

        const protocolMap = {
			kernelDao: () => new KernelDaoProvider(provider, 56),
			venus: () => new VenusProvider(provider, 56),
			lista: () => new ListaProvider(provider, 56),
		};

		const stakingProtocols = registeredProtocols
			.filter(protocol => protocol in protocolMap)
			.map(protocol => protocolMap[protocol as keyof typeof protocolMap]());
		
	
		const stakingPlugin = new StakingPlugin();
		await stakingPlugin.initialize({
            defaultSlippage: 0.5,
            defaultChain: 'bnb',
            providers: stakingProtocols,
            supportedChains: ['bnb'], // These will be intersected with agent's networks
          });
		ToolStaking.stakingPlugin = stakingPlugin;
        
		const tool = new DynamicTool({
			name: OnchainToolName.STAKING_TOOL,
			description: 'Stake tool for BinkAI',
			func: async (subject: string) => {
				return subject;
			},
		});

		return {
			response: logWrapper(tool, this),
		};
	}
}
